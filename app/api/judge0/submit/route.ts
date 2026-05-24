import { NextRequest, NextResponse } from "next/server";

const JUDGE0_SUBMIT_URL = "https://judge0-ce.p.rapidapi.com/submissions";

export async function POST(request: NextRequest) {
  try {
    const { source_code, language_id } = await request.json();

    if (!source_code || !language_id) {
      return NextResponse.json(
        { error: "Missing source_code or language_id" },
        { status: 400 }
      );
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      return NextResponse.json(
        {
          error:
            "Judge0 is not configured on this server. Set RAPIDAPI_KEY in .env.local — see https://rapidapi.com/judge0-official/api/judge0-ce",
          code: "JUDGE0_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const res = await fetch(JUDGE0_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        source_code,
        language_id,
        stdin: "",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error:
              "Judge0 rejected the RAPIDAPI_KEY. Confirm the key is valid and you've subscribed to the Judge0 CE plan on RapidAPI.",
            code: "JUDGE0_AUTH_FAILED",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Submit failed", details: body },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ token: data.token });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
