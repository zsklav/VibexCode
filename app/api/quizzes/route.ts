// GET  /api/quizzes              — list upcoming quizzes (date >= now)
// GET  /api/quizzes?scope=all    — list every quiz (admin UI)
// POST /api/quizzes              — admin-only: create a quiz
//   Body: { userEmail, title, description?, date (ISO string), registrationLink? }

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Quizzes from "@/models/Quizzes";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    // `?scope=all` returns every quiz, newest-first — used by the admin
    // panel. Default (no scope) keeps the public "upcoming only" behavior.
    const filter = scope === "all" ? {} : { date: { $gte: new Date() } };
    const sort: Record<string, 1 | -1> =
      scope === "all" ? { date: -1 } : { date: 1 };

    const quizzes = await Quizzes.find(filter).sort(sort).limit(100).lean();

    return NextResponse.json({ success: true, quizzes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch quizzes";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, title, description, date, registrationLink } =
      body || {};

    if (!isAdminEmail(userEmail)) {
      return NextResponse.json(
        { success: false, error: "Only admins can create quizzes" },
        { status: 403 }
      );
    }

    if (!title?.trim() || !date) {
      return NextResponse.json(
        { success: false, error: "title and date are required" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "date must be a valid ISO date string" },
        { status: 400 }
      );
    }

    await connectDB();

    const quiz = await Quizzes.create({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      date: parsedDate,
      registrationLink:
        typeof registrationLink === "string" ? registrationLink.trim() : "",
      createdByEmail: userEmail.toLowerCase(),
    });

    return NextResponse.json({ success: true, quiz }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create quiz";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
