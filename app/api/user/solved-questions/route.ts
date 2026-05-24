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
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/Users";
import Questions from "@/models/Questions";

type SolvedQuestionCategory = {
  name: string;
  questionCount: number;
  progress: number;
  questions: string[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json(
        { error: "userEmail is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const solvedIds: string[] = (user.solvedQuestionIds || []).filter(
      (id: string) => isValidObjectId(id)
    );

    const solvedQuestions = await Questions.find({
      _id: { $in: solvedIds },
    }).lean<
      Array<{
        _id: unknown;
        title?: string;
        tags?: string[];
        difficulty?: string;
      }>
    >();
    const allQuestions = await Questions.find({}).lean<
      Array<{ tags?: string[]; difficulty?: string }>
    >();

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
