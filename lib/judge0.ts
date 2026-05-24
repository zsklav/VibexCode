// lib/judge0.ts

export type Judge0Result = {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string | number;
  memory?: number | string;
  status?: { id: number; description: string };
  error?: string;
  errorCode?: string;
};

export const runJudge0Advanced = async (
  code: string,
  languageId: number
): Promise<Judge0Result> => {
  try {
    // Submit code
    const submitRes = await fetch("/api/judge0/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
      }),
    });

    if (!submitRes.ok) {
      const body = await submitRes.json().catch(() => ({}));
      return {
        error:
          body?.error ||
          `Code execution failed (HTTP ${submitRes.status}).`,
        errorCode: body?.code,
      };
    }

    const { token } = await submitRes.json();

    // Poll for result
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const resultRes = await fetch(`/api/judge0/result/${token}`);

      if (!resultRes.ok) {
        const body = await resultRes.json().catch(() => ({}));
        return {
          error:
            body?.error ||
            `Code execution result fetch failed (HTTP ${resultRes.status}).`,
          errorCode: body?.code,
        };
      }

      const result = (await resultRes.json()) as Judge0Result;

      // Status > 2 means execution is complete (1=in queue, 2=processing).
      if (result.status && result.status.id > 2) {
        return result;
      }

      attempts++;
    }

    return { stderr: "❌ Execution timeout — Judge0 took longer than 10s." };
  } catch (err) {
    console.error("Error calling Judge0 API:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to execute code. Please try again.",
    };
  }
};
