import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as submitPost } from "@/app/api/judge0/submit/route";
import { GET as resultGet } from "@/app/api/judge0/result/[token]/route";
import { NextRequest } from "next/server";

/**
 * Tests for the Judge0 proxy routes.
 *
 * The routes act as a thin server-side proxy in front of the upstream Judge0
 * (RapidAPI) endpoint — they validate input, forward the request with the
 * RAPIDAPI_KEY (which never reaches the client), and shape the response with
 * safe defaults. The upstream `fetch` call is the seam we mock here.
 */

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_KEY = process.env.RAPIDAPI_KEY;

function buildPostRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

function buildGetContext(token: string) {
  return { params: Promise.resolve({ token }) };
}

function jsonResponse(body: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.RAPIDAPI_KEY = "test-rapidapi-key";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) {
    delete process.env.RAPIDAPI_KEY;
  } else {
    process.env.RAPIDAPI_KEY = ORIGINAL_KEY;
  }
});

describe("POST /api/judge0/submit", () => {
  it("rejects missing source_code with 400", async () => {
    const res = await submitPost(buildPostRequest({ language_id: 63 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing source_code or language_id");
  });

  it("rejects missing language_id with 400", async () => {
    const res = await submitPost(buildPostRequest({ source_code: "print(1)" }));
    expect(res.status).toBe(400);
  });

  it("forwards valid submissions and returns the upstream token", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ token: "tok-abc-123" }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const res = await submitPost(
      buildPostRequest({ source_code: "console.log(1)", language_id: 63 })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: "tok-abc-123" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://judge0-ce.p.rapidapi.com/submissions");
    expect(init.method).toBe("POST");
    expect(init.headers["X-RapidAPI-Key"]).toBe("test-rapidapi-key");
    expect(init.headers["X-RapidAPI-Host"]).toBe("judge0-ce.p.rapidapi.com");
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({
      source_code: "console.log(1)",
      language_id: 63,
      stdin: "",
    });
  });

  it("propagates the upstream status code on Judge0 failure", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: "Unauthorized" }, { status: 401 })
      ) as unknown as typeof fetch;

    const res = await submitPost(
      buildPostRequest({ source_code: "x", language_id: 1 })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Submit failed");
  });

  it("returns 500 with a safe message when fetch throws", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("boom")) as unknown as typeof fetch;

    const res = await submitPost(
      buildPostRequest({ source_code: "x", language_id: 1 })
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
    // Internal error message should NOT leak to the client.
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});

describe("GET /api/judge0/result/[token]", () => {
  it("normalizes upstream payload with safe defaults", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        stdout: "hello\n",
        // stderr, compile_output, status, time, memory all missing
      })
    ) as unknown as typeof fetch;

    const res = await resultGet(
      {} as NextRequest,
      buildGetContext("tok-abc-123")
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      stdout: "hello\n",
      stderr: "",
      compile_output: "",
      status: {},
      time: null,
      memory: null,
    });
  });

  it("includes the token in the upstream URL", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ stdout: "" }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await resultGet({} as NextRequest, buildGetContext("my-token"));

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://judge0-ce.p.rapidapi.com/submissions/my-token");
  });

  it("propagates the upstream status code on Judge0 failure", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: "not found" }, { status: 404 })
      ) as unknown as typeof fetch;

    const res = await resultGet({} as NextRequest, buildGetContext("missing"));

    expect(res.status).toBe(404);
  });
});
