import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserModel from "@/models/Users";

// POST /api/user/mark-solved
// Body: { userEmail, questionId, submittedAnswer?, language?, executionStats? }
//
// NOTE: previous implementation verified an Appwrite JWT and looked up the
// user by appwriteId. We now identify via email (matches the trust model
// used by /api/submit). See lib/auth.ts for the security caveat.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userEmail,
      questionId,
      submittedAnswer,
      language,
      executionStats,
    } = body || {};

    if (!userEmail || typeof userEmail !== "string") {
      return NextResponse.json({ error: "Invalid userEmail" }, { status: 400 });
    }
    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "Invalid questionId" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use the schema's helper which keeps both solvedQuestions and the
    // legacy solvedQuestionIds in sync, and updates streak/stats.
    const added = user.addSolvedQuestion(
      questionId,
      submittedAnswer,
      language,
      executionStats
    );
    if (added) await user.save();

    return NextResponse.json({ success: true, alreadySolved: !added });
  } catch (error) {
    console.error("Error marking solved question:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
