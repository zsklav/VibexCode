// /app/api/user/solved-questions/route.ts
//
// GET /api/user/solved-questions?userEmail=foo@bar.com
//
// Returns the user's solved questions grouped by tag (the Questions schema
// has `tags` and `difficulty`, not a single `category` — we use the first
// tag as the grouping key, falling back to difficulty).
//
// Previously this endpoint verified an Appwrite JWT and looked up the
// user by appwriteId. It now uses email-based identification — see
// lib/auth.ts for the security caveat.

import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { normalizeEmail } from "@/lib/firestore-helpers";

type SolvedQuestionCategory = {
  name: string;
  questionCount: number;
  progress: number;
  questions: string[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normalizeEmail(searchParams.get("userEmail"));

    if (!userEmail) {
      return NextResponse.json(
        { error: "userEmail is required" },
        { status: 400 }
      );
    }

    const userSnapshot = await db
      .collection("users")
      .where("email", "==", userEmail)
      .limit(1)
      .get();
    if (userSnapshot.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userSnapshot.docs[0].data();
    const solvedIds = Array.isArray(user.solvedQuestionIds)
      ? (user.solvedQuestionIds as string[])
      : Array.isArray(user.solvedQuestions)
        ? (user.solvedQuestions as Array<{ questionId?: string }>)
          .map((sq) => sq.questionId)
          .filter((id): id is string => typeof id === "string")
        : [];

    const uniqueSolvedIds = Array.from(new Set(solvedIds));

    const solvedQuestions: Array<{
      id: string;
      title?: string;
      tags?: string[];
      difficulty?: string;
    }> = [];

    for (let i = 0; i < uniqueSolvedIds.length; i += 10) {
      const chunk = uniqueSolvedIds.slice(i, i + 10);
      const chunkSnap = await db
        .collection("questions")
        .where(FieldPath.documentId(), "in", chunk)
        .get();
      chunkSnap.docs.forEach((doc) => {
        const data = doc.data();
        solvedQuestions.push({
          id: doc.id,
          title: data.title,
          tags: data.tags,
          difficulty: data.difficulty,
        });
      });
    }

    const allQuestionsSnap = await db.collection("questions").get();
    const allQuestions = allQuestionsSnap.docs.map((doc) => {
      const data = doc.data();
      return { tags: data.tags as string[] | undefined, difficulty: data.difficulty as string | undefined };
    });

    const groupingKey = (q: { tags?: string[]; difficulty?: string }) =>
      (q.tags && q.tags[0]) || q.difficulty || "uncategorized";

    const totalByCategory: Record<string, number> = {};
    allQuestions.forEach((q) => {
      const key = groupingKey(q);
      totalByCategory[key] = (totalByCategory[key] || 0) + 1;
    });

    const categoryMap: Record<
      string,
      { questions: string[]; totalQuestions: number }
    > = {};

    solvedQuestions.forEach((q) => {
      const key = groupingKey(q);
      if (!categoryMap[key]) {
        categoryMap[key] = {
          questions: [],
          totalQuestions: totalByCategory[key] || 0,
        };
      }
      categoryMap[key].questions.push(q.title || "Untitled");
    });

    const solvedQuestionsData: SolvedQuestionCategory[] = Object.entries(
      categoryMap
    ).map(([category, { questions, totalQuestions }]) => ({
      name: category,
      questionCount: questions.length,
      progress: totalQuestions
        ? Math.round((questions.length / totalQuestions) * 100)
        : 0,
      questions,
    }));

    return NextResponse.json({
      success: true,
      solvedQuestions: solvedQuestionsData,
    });
  } catch (error: unknown) {
    console.error("[GET] /api/user/solved-questions error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
