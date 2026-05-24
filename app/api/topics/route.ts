// GET /api/topics
//
// Returns the distinct tags currently used by Questions, with a count of
// how many problems carry each tag. Replaces the old hardcoded
// dummyQuestions categories list.
//
// Shape: [{ name: "Arrays", count: 12 }, ...]

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Questions from "@/models/Questions";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const aggregated = await Questions.aggregate<{
      _id: string;
      count: number;
    }>([
      { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
      { $match: { tags: { $ne: "" } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const topics = aggregated.map((row) => ({
      name: row._id,
      count: row.count,
    }));

    return NextResponse.json({ success: true, topics });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch topics";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
