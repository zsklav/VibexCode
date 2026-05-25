import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { normalizeEmail } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ clanId: string }> }
) {
    try {
        const { clanId } = await params;
        const { ownerEmail, memberEmailToKick } = await request.json();

        const normalizedOwner = normalizeEmail(ownerEmail);
        const targetEmail = normalizeEmail(memberEmailToKick);

        if (!normalizedOwner || !targetEmail) {
            return NextResponse.json(
                { message: "ownerEmail and memberEmailToKick are required" },
                { status: 400 }
            );
        }

        if (!clanId) {
            return NextResponse.json(
                { message: "Invalid clan ID" },
                { status: 400 }
            );
        }

        const clanRef = db.collection("clans").doc(clanId);
        const clanSnap = await clanRef.get();
        if (!clanSnap.exists) {
            return NextResponse.json(
                { message: "Clan not found" },
                { status: 404 }
            );
        }

        const clan = clanSnap.data() || {};
        if ((clan.ownerEmail as string) !== normalizedOwner) {
            return NextResponse.json(
                { message: "Only the clan owner can kick members" },
                { status: 403 }
            );
        }

        if (targetEmail === normalizedOwner) {
            return NextResponse.json(
                { message: "The owner cannot kick themselves" },
                { status: 400 }
            );
        }

        const memberDocId = `${clanId}__${targetEmail}`;
        const memberRef = db.collection("clanMembers").doc(memberDocId);
        const memberSnap = await memberRef.get();
        if (!memberSnap.exists) {
            return NextResponse.json(
                { message: "User is not a member of this clan" },
                { status: 404 }
            );
        }

        await memberRef.delete();

        return NextResponse.json({ message: "Successfully kicked user" });
    } catch (error) {
        const errMessage =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { message: "Failed to kick user", error: errMessage },
            { status: 500 }
        );
    }
}
