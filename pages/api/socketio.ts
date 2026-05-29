import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "../../types/next"; // your extended type
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/firebase-admin";
import { detectAbuse } from "../../lib/moderation";
import { toDate } from "../../lib/firestore-helpers";

export const config = {
    api: {
        bodyParser: false,
    },
};

let io: IOServer | undefined;
const boardViewers = new Map<string, Map<string, { userId: string; name: string }>>();

type ModerationState = {
    warnings?: Array<{ at?: string | Date }>;
    chatBannedUntil?: string | Date;
};

type UserRecord = {
    moderation?: ModerationState;
};

async function resolveUser(senderId: string): Promise<UserRecord | null> {
    const users = db.collection("users");
    const byId = await users.doc(senderId).get();
    if (byId.exists) return (byId.data() as UserRecord) || null;

    const byUid = await users
        .where("firebaseUid", "==", senderId)
        .limit(1)
        .get();
    if (!byUid.empty) return (byUid.docs[0].data() as UserRecord) || null;

    return null;
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponseServerIO
) {
    if (!res.socket.server.io) {
        console.log("🔌 Initializing Socket.io server...");
        const httpServer = res.socket.server as unknown as HTTPServer;

        io = new IOServer(httpServer, {
            path: "/api/socketio",
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        io.on("connection", (socket) => {
            console.log("🟢 Socket connected:", socket.id);

            socket.on("join", ({ conversationId }) => {
                if (typeof conversationId === "string") {
                    socket.join(conversationId);
                    console.log(`👥 ${socket.id} joined room ${conversationId}`);
                }
            });

            socket.on("leave", ({ conversationId }) => {
                if (typeof conversationId === "string") {
                    socket.leave(conversationId);
                    console.log(`🚪 ${socket.id} left room ${conversationId}`);
                }
            });

            socket.on("board:join", ({ roomId, userId, name }) => {
                if (typeof roomId !== "string") return;
                socket.join(`board:${roomId}`);
                const viewers = boardViewers.get(roomId) || new Map();
                viewers.set(socket.id, {
                    userId: typeof userId === "string" ? userId : socket.id,
                    name: typeof name === "string" ? name : "Collaborator",
                });
                boardViewers.set(roomId, viewers);
                io?.to(`board:${roomId}`).emit("board:presence", {
                    roomId,
                    collaborators: Array.from(viewers.values()),
                });
            });

            socket.on("board:leave", ({ roomId }) => {
                if (typeof roomId !== "string") return;
                socket.leave(`board:${roomId}`);
                const viewers = boardViewers.get(roomId);
                viewers?.delete(socket.id);
                io?.to(`board:${roomId}`).emit("board:presence", {
                    roomId,
                    collaborators: Array.from(viewers?.values() || []),
                });
            });

            socket.on("board:update", ({ roomId, elements, userId }) => {
                if (typeof roomId !== "string" || !Array.isArray(elements)) return;
                socket.to(`board:${roomId}`).emit("board:update", {
                    roomId,
                    elements,
                    userId,
                    updatedAt: new Date().toISOString(),
                });
            });

            socket.on("board:save", ({ roomId, elements, userId }) => {
                if (typeof roomId !== "string" || !Array.isArray(elements)) return;
                socket.to(`board:${roomId}`).emit("board:save", {
                    roomId,
                    elements,
                    userId,
                    savedAt: new Date().toISOString(),
                });
            });

            socket.on("board:cursor", ({ roomId, userId, name, x, y }) => {
                if (typeof roomId !== "string") return;
                socket.to(`board:${roomId}`).emit("board:cursor", {
                    roomId,
                    userId,
                    name,
                    x,
                    y,
                });
            });

            socket.on("poll:create", ({ conversationId, poll, message }) => {
                if (typeof conversationId !== "string") return;
                io?.to(conversationId).emit("poll:update", { poll });
                if (message) io?.to(conversationId).emit("message", message);
            });

            socket.on("poll:vote", ({ conversationId, poll }) => {
                if (typeof conversationId !== "string" || !poll) return;
                io?.to(conversationId).emit("poll:update", { poll });
            });

            socket.on("poll:expire", ({ conversationId, pollId }) => {
                if (typeof conversationId !== "string") return;
                io?.to(conversationId).emit("poll:expire", { pollId });
            });

            socket.on("theme:update", ({ userId, theme }) => {
                if (typeof userId !== "string" || typeof theme !== "string") return;
                io?.emit("theme:update", { userId, theme });
            });

            socket.on("message", async (message) => {
                const { conversationId, senderId, body } = message || {};
                if (typeof conversationId !== "string") {
                    console.warn(
                        `Received message without valid conversationId from ${socket.id}`
                    );
                    return;
                }
                if (typeof senderId !== "string" || typeof body !== "string") {
                    console.warn(`Received invalid message payload from ${socket.id}`);
                    return;
                }

                try {
                    const user = await resolveUser(senderId);
                    if (!user) return;

                    const now = new Date();
                    const bannedUntil = toDate(user.moderation?.chatBannedUntil);
                    if (bannedUntil && bannedUntil > now) return;

                    const abuse = detectAbuse(body);
                    if (abuse.hit) return;
                } catch (err) {
                    console.error("Failed to validate socket message:", err);
                    return;
                }

                console.log(`📣 Broadcasting message to room: ${conversationId}`, message);
                io?.to(conversationId).emit("message", {
                    ...message,
                    _id: message?._id || uuidv4(),
                    createdAt: message?.createdAt || new Date().toISOString(),
                });
            });

            socket.on("disconnect", () => {
                for (const [roomId, viewers] of boardViewers.entries()) {
                    if (!viewers.has(socket.id)) continue;
                    viewers.delete(socket.id);
                    io?.to(`board:${roomId}`).emit("board:presence", {
                        roomId,
                        collaborators: Array.from(viewers.values()),
                    });
                }
                console.log(`🔴 Socket disconnected: ${socket.id}`);
            });
        });

        res.socket.server.io = io;
        console.log("✅ Socket.io initialized");
    }

    res.end();
}
