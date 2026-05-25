// DELETE /api/quizzes/[id]
//   Body: { userEmail }   — admin-only

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!id) {
            return NextResponse.json(
                { success: false, error: "Invalid quiz id" },
                { status: 400 }
            );
        }

        const body = await req.json().catch(() => ({}));
        if (!isAdminEmail(body?.userEmail)) {
            return NextResponse.json(
                { success: false, error: "Only admins can delete quizzes" },
                { status: 403 }
            );
        }

        const docRef = db.collection("quizzes").doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return NextResponse.json(
                { success: false, error: "Quiz not found" },
                { status: 404 }
            );
        }

        await docRef.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to delete quiz";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
