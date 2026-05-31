// POST /api/clan/create
//   Body: { userEmail, name }
//   Creator auto-joins as owner.

import { NextRequest, NextResponse } from "next/server";
import { createClan, AlreadyInClanError } from "@/lib/clans";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userEmail, name } = await request.json();
    if (!userEmail || !name?.trim()) {
      return NextResponse.json(
        { message: "userEmail and name are required" },
        { status: 400 }
      );
    }

    const clan = await createClan({ email: userEmail, name });
    return NextResponse.json(clan);
  } catch (error) {
    if (error instanceof AlreadyInClanError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create clan", error: errMessage },
      { status: 500 }
    );
  }
}
