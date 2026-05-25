// GET  /api/quizzes              — list upcoming quizzes (date >= now)
// GET  /api/quizzes?scope=all    — list every quiz (admin UI)
// POST /api/quizzes              — admin-only: create a quiz
//   Body: { userEmail, title, description?, date (ISO string), registrationLink? }

import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/auth";
import { toIso } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const scope = searchParams.get("scope");

        const quizzesRef = db.collection("quizzes");
        let query = quizzesRef.orderBy("date", scope === "all" ? "desc" : "asc");
        if (scope !== "all") {
            query = query.where("date", ">=", Timestamp.fromDate(new Date()));
        }

        const snapshot = await query.limit(100).get();
        const quizzes = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                _id: doc.id,
                ...data,
                date: toIso(data.date),
                createdAt: toIso(data.createdAt),
                updatedAt: toIso(data.updatedAt),
            };
        });

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

        const quizRef = await db.collection("quizzes").add({
            title: title.trim(),
            description: typeof description === "string" ? description.trim() : "",
            date: Timestamp.fromDate(parsedDate),
            registrationLink:
                typeof registrationLink === "string" ? registrationLink.trim() : "",
            createdByEmail: typeof userEmail === "string" ? userEmail.toLowerCase() : "",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        const created = await quizRef.get();
        const data = created.data() || {};
        return NextResponse.json(
            {
                success: true,
                quiz: {
                    _id: quizRef.id,
                    ...data,
                    date: toIso(data.date),
                    createdAt: toIso(data.createdAt),
                    updatedAt: toIso(data.updatedAt),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to create quiz";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
