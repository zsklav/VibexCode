import { Timestamp } from "firebase-admin/firestore";

export function normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    return normalized ? normalized : null;
}

export function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === "object" && typeof (value as any).toDate === "function") {
        return (value as any).toDate();
    }
    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

export function toIso(value: unknown): string | null {
    const date = toDate(value);
    return date ? date.toISOString() : null;
}
