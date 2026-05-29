import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue as AdminFieldValue, getFirestore, Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import mongoose from "mongoose";
import connectDB from "./mongodb";

// Statically import Mongoose models to ensure they are registered
import User from "@/models/Users";
import Message from "@/models/Messages";
import Question from "@/models/Questions";
import Submissions from "@/models/Submissions";
import Task from "@/models/Tasks";
import Quiz from "@/models/Quizzes";
import Clan from "@/models/Clans";
import ClanMember from "@/models/ClanMembers";
import Follow from "@/models/Follows";
import Whiteboard from "@/models/Whiteboards";
import Poll from "@/models/Polls";
import UserTheme from "@/models/UserThemes";

type ServiceAccount = {
    projectId: string;
    clientEmail: string;
    privateKey: string;
};

function parseServiceAccount(): ServiceAccount | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Partial<ServiceAccount> & {
                private_key?: string;
                client_email?: string;
                project_id?: string;
            };
            if (parsed.private_key && parsed.client_email && parsed.project_id) {
                return {
                    projectId: parsed.project_id,
                    clientEmail: parsed.client_email,
                    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
                };
            }
        } catch {
            return null;
        }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (projectId && clientEmail && privateKey) {
        return {
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
        };
    }

    return null;
}

function getProjectId(): string | undefined {
    return (
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
}

const serviceAccount = parseServiceAccount();
const hasCredentials =
    !!serviceAccount ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.FIRESTORE_EMULATOR_HOST;

// Map collections to Mongoose models
const collectionsMap: Record<string, any> = {
    users: User,
    messages: Message,
    questions: Question,
    submissions: Submissions,
    tasks: Task,
    quizzes: Quiz,
    clans: Clan,
    clanMembers: ClanMember,
    follows: Follow,
    whiteboards: Whiteboard,
    polls: Poll,
    userThemes: UserTheme,
};

// Mock Timestamp class
class MockTimestamp {
    private date: Date;
    constructor(date: Date) {
        this.date = date;
    }
    toDate() {
        return this.date;
    }
    toMillis() {
        return this.date.getTime();
    }
    get seconds() {
        return Math.floor(this.date.getTime() / 1000);
    }
    get nanoseconds() {
        return (this.date.getTime() % 1000) * 1e6;
    }
    toISOString() {
        return this.date.toISOString();
    }
}

// Transparent Delegator Class to serve as both runtime constructor and TypeScript type
class Timestamp {
    private delegate: any;

    constructor(seconds: number, nanoseconds: number) {
        if (hasCredentials) {
            this.delegate = new AdminTimestamp(seconds, nanoseconds);
        } else {
            this.delegate = new MockTimestamp(new Date(seconds * 1000 + nanoseconds / 1e6));
        }
    }

    toDate(): Date {
        return this.delegate.toDate();
    }

    toMillis(): number {
        return this.delegate.toMillis();
    }

    get seconds(): number {
        return this.delegate.seconds;
    }

    get nanoseconds(): number {
        return this.delegate.nanoseconds;
    }

    toISOString(): string {
        return this.delegate.toISOString ? this.delegate.toISOString() : new Date(this.delegate.toMillis()).toISOString();
    }

    static now(): Timestamp {
        const t = Object.create(Timestamp.prototype);
        if (hasCredentials) {
            t.delegate = AdminTimestamp.now();
        } else {
            t.delegate = new MockTimestamp(new Date());
        }
        return t;
    }

    static fromDate(date: Date): Timestamp {
        const t = Object.create(Timestamp.prototype);
        if (hasCredentials) {
            t.delegate = AdminTimestamp.fromDate(date);
        } else {
            t.delegate = new MockTimestamp(date);
        }
        return t;
    }

    static fromMillis(ms: number): Timestamp {
        const t = Object.create(Timestamp.prototype);
        if (hasCredentials) {
            t.delegate = AdminTimestamp.fromMillis(ms);
        } else {
            t.delegate = new MockTimestamp(new Date(ms));
        }
        return t;
    }
}

// Mock FieldValue operations
const MockFieldValue = {
    serverTimestamp: () => ({ __isFieldValue: true, type: "serverTimestamp" }),
    increment: (n: number) => ({ __isFieldValue: true, type: "increment", value: n }),
    arrayUnion: (...values: any[]) => ({ __isFieldValue: true, type: "arrayUnion", values }),
    arrayRemove: (...values: any[]) => ({ __isFieldValue: true, type: "arrayRemove", values }),
};

function mapMongoDocToFirestore(doc: any) {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    if (obj._id) {
        obj.id = obj._id.toString();
        delete obj._id;
    }
    delete obj.__v;

    const convertObjectIds = (item: any): any => {
        if (!item) return item;
        if (item instanceof mongoose.Types.ObjectId) {
            return item.toString();
        }
        if (Array.isArray(item)) {
            return item.map(convertObjectIds);
        }
        if (typeof item === "object" && !(item instanceof Date)) {
            const newObj: any = {};
            for (const [k, v] of Object.entries(item)) {
                newObj[k] = convertObjectIds(v);
            }
            return newObj;
        }
        return item;
    };

    return convertObjectIds(obj);
}

function cleanFirestoreData(data: any) {
    if (!data || typeof data !== "object") return;
    for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === "object") {
            if ((val as any).__isFieldValue) {
                const fv = val as any;
                if (fv.type === "serverTimestamp") {
                    data[key] = new Date();
                } else {
                    delete data[key];
                }
            } else if (val instanceof Timestamp || val instanceof MockTimestamp) {
                data[key] = val.toDate();
            } else if (typeof (val as any).toDate === "function") {
                data[key] = (val as any).toDate();
            } else {
                cleanFirestoreData(val);
            }
        }
    }
}

class MockDocumentSnapshot {
    id: string;
    exists: boolean;
    ref: MockDocumentReference;
    private _data: any;

    constructor(id: string, exists: boolean, data: any, ref: MockDocumentReference) {
        this.id = id;
        this.exists = exists;
        this._data = data;
        this.ref = ref;
    }

    data() {
        return this._data;
    }
}

class MockDocumentReference {
    id: string;
    private collectionName: string;
    private model: any;

    constructor(id: string, collectionName: string, model: any) {
        this.id = id;
        this.collectionName = collectionName;
        this.model = model;
    }

    async get() {
        await connectDB();
        let doc = null;
        try {
            if (mongoose.isValidObjectId(this.id)) {
                doc = await this.model.findById(this.id);
            } else {
                doc = await this.model.findOne({ _id: this.id });
            }
        } catch {
            doc = null;
        }

        if (!doc && this.collectionName === "users") {
            try {
                doc = await this.model.findOne({
                    $or: [
                        { firebaseUid: this.id },
                        { email: this.id },
                    ],
                });
            } catch {
                doc = null;
            }
        }

        const exists = !!doc;
        const data = exists ? mapMongoDocToFirestore(doc) : null;
        const actualId = doc ? doc._id.toString() : this.id;
        return new MockDocumentSnapshot(actualId, exists, data, this);
    }

    async set(data: any, options?: { merge?: boolean }) {
        await connectDB();
        const updateData = { ...data };
        cleanFirestoreData(updateData);

        const mongoUpdate: any = {};
        const setObj: any = {};
        const incObj: any = {};
        const addToSetObj: any = {};
        const pullObj: any = {};

        for (const [key, val] of Object.entries(updateData)) {
            if (val && typeof val === "object" && (val as any).__isFieldValue) {
                const fv = val as any;
                if (fv.type === "serverTimestamp") {
                    setObj[key] = new Date();
                } else if (fv.type === "increment") {
                    incObj[key] = fv.value;
                } else if (fv.type === "arrayUnion") {
                    addToSetObj[key] = { $each: fv.values };
                } else if (fv.type === "arrayRemove") {
                    pullObj[key] = { $in: fv.values };
                }
            } else {
                setObj[key] = val;
            }
        }

        if (Object.keys(setObj).length > 0) mongoUpdate.$set = setObj;
        if (Object.keys(incObj).length > 0) mongoUpdate.$inc = incObj;
        if (Object.keys(addToSetObj).length > 0) mongoUpdate.$addToSet = addToSetObj;
        if (Object.keys(pullObj).length > 0) mongoUpdate.$pull = pullObj;

        if (options?.merge) {
            try {
                if (mongoose.isValidObjectId(this.id)) {
                    await this.model.updateOne({ _id: this.id }, mongoUpdate, { upsert: true });
                } else {
                    await this.model.updateOne(
                        {
                            $or: [
                                { _id: this.id },
                                ...(this.collectionName === "users" ? [
                                    { firebaseUid: this.id },
                                    { email: this.id }
                                ] : [])
                            ]
                        },
                        mongoUpdate,
                        { upsert: true }
                    );
                }
            } catch (err) {
                console.error(`Error setting merged document in fallback:`, err);
            }
        } else {
            try {
                const docData = { _id: this.id, ...setObj };
                if (mongoose.isValidObjectId(this.id)) {
                    await this.model.replaceOne({ _id: this.id }, docData, { upsert: true });
                } else {
                    await this.model.replaceOne(
                        {
                            $or: [
                                { _id: this.id },
                                ...(this.collectionName === "users" ? [
                                    { firebaseUid: this.id },
                                    { email: this.id }
                                ] : [])
                            ]
                        },
                        docData,
                        { upsert: true }
                    );
                }
            } catch (err) {
                console.error(`Error setting document in fallback:`, err);
            }
        }
        return this;
    }

    async update(data: any) {
        await connectDB();
        const updateData = { ...data };
        cleanFirestoreData(updateData);

        const mongoUpdate: any = {};
        const setObj: any = {};
        const incObj: any = {};
        const addToSetObj: any = {};
        const pullObj: any = {};

        for (const [key, val] of Object.entries(updateData)) {
            if (val && typeof val === "object" && (val as any).__isFieldValue) {
                const fv = val as any;
                if (fv.type === "serverTimestamp") {
                    setObj[key] = new Date();
                } else if (fv.type === "increment") {
                    incObj[key] = fv.value;
                } else if (fv.type === "arrayUnion") {
                    addToSetObj[key] = { $each: fv.values };
                } else if (fv.type === "arrayRemove") {
                    pullObj[key] = { $in: fv.values };
                }
            } else {
                setObj[key] = val;
            }
        }

        if (Object.keys(setObj).length > 0) mongoUpdate.$set = setObj;
        if (Object.keys(incObj).length > 0) mongoUpdate.$inc = incObj;
        if (Object.keys(addToSetObj).length > 0) mongoUpdate.$addToSet = addToSetObj;
        if (Object.keys(pullObj).length > 0) mongoUpdate.$pull = pullObj;

        try {
            if (mongoose.isValidObjectId(this.id)) {
                await this.model.updateOne({ _id: this.id }, mongoUpdate);
            } else {
                await this.model.updateOne(
                    {
                        $or: [
                            { _id: this.id },
                            ...(this.collectionName === "users" ? [
                                { firebaseUid: this.id },
                                { email: this.id }
                            ] : [])
                        ]
                    },
                    mongoUpdate
                );
            }
        } catch (err) {
            console.error(`Error updating document in fallback:`, err);
        }
        return this;
    }

    async delete() {
        await connectDB();
        try {
            if (mongoose.isValidObjectId(this.id)) {
                await this.model.deleteOne({ _id: this.id });
            } else {
                await this.model.deleteOne({
                    $or: [
                        { _id: this.id },
                        ...(this.collectionName === "users" ? [
                            { firebaseUid: this.id },
                            { email: this.id }
                        ] : [])
                    ]
                });
            }
        } catch (err) {
            console.error(`Error deleting document in fallback:`, err);
        }
    }
}

class MockQuery {
    protected collectionName: string;
    protected model: any;
    private conditions: any[] = [];
    private orderFields: { field: string; dir: "asc" | "desc" }[] = [];
    private limitCount: number | null = null;

    constructor(collectionName: string, model: any) {
        this.collectionName = collectionName;
        this.model = model;
    }

    where(field: string, op: string, value: any) {
        this.conditions.push({ field, op, value });
        return this;
    }

    orderBy(field: string, dir: "asc" | "desc" = "asc") {
        this.orderFields.push({ field, dir });
        return this;
    }

    limit(n: number) {
        this.limitCount = n;
        return this;
    }

    async get() {
        await connectDB();

        const queryObj: any = {};
        for (const cond of this.conditions) {
            let { field, op, value } = cond;
            if (field === "id" || field === "_id") {
                field = "_id";
            }

            if (op === "==") {
                queryObj[field] = value;
            } else if (op === ">") {
                queryObj[field] = { $gt: value };
            } else if (op === ">=") {
                queryObj[field] = { $gte: value };
            } else if (op === "<") {
                queryObj[field] = { $lt: value };
            } else if (op === "<=") {
                queryObj[field] = { $lte: value };
            } else if (op === "in") {
                queryObj[field] = { $in: value };
            } else if (op === "array-contains") {
                queryObj[field] = value;
            }
        }

        try {
            let query = this.model.find(queryObj);

            if (this.orderFields.length > 0) {
                const sortObj: any = {};
                for (const order of this.orderFields) {
                    sortObj[order.field] = order.dir === "desc" ? -1 : 1;
                }
                query = query.sort(sortObj);
            }

            if (this.limitCount !== null) {
                query = query.limit(this.limitCount);
            }

            const docs = await query.exec();

            const mockDocs = docs.map((doc: any) => {
                const id = doc._id.toString();
                const data = mapMongoDocToFirestore(doc);
                const ref = new MockDocumentReference(id, this.collectionName, this.model);
                return new MockDocumentSnapshot(id, true, data, ref);
            });

            return {
                docs: mockDocs,
                empty: mockDocs.length === 0,
                size: mockDocs.length,
            };
        } catch (err) {
            console.error(`Error executing fallback query for "${this.collectionName}":`, err);
            return {
                docs: [],
                empty: true,
                size: 0,
            };
        }
    }
}

class MockCollectionReference extends MockQuery {
    constructor(collectionName: string, model: any) {
        super(collectionName, model);
    }

    doc(id?: string) {
        const actualId = id || new mongoose.Types.ObjectId().toString();
        return new MockDocumentReference(actualId, this.collectionName, this.model);
    }

    async add(data: any) {
        await connectDB();
        const insertData = { ...data };
        cleanFirestoreData(insertData);

        try {
            const doc = new this.model(insertData);
            await doc.save();
            const id = doc._id.toString();
            return new MockDocumentReference(id, this.collectionName, this.model);
        } catch (err) {
            console.error(`Error adding document to fallback "${this.collectionName}":`, err);
            // Return a dummy ref to avoid breaking downstream code
            const dummyId = new mongoose.Types.ObjectId().toString();
            return new MockDocumentReference(dummyId, this.collectionName, this.model);
        }
    }
}

class MongooseFirestoreShim {
    collection(name: string) {
        const model = collectionsMap[name];
        if (!model) {
            console.warn(`[VibeXcode DB Shim] Unknown collection: "${name}". Check mapping.`);
            // Fallback dynamically
            const dynamicModel = mongoose.models[name] || mongoose.model(name, new mongoose.Schema({}, { strict: false }));
            return new MockCollectionReference(name, dynamicModel);
        }
        return new MockCollectionReference(name, model);
    }

    async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
        const tx = {
            get: async (ref: any) => ref.get(),
            set: async (ref: any, data: any, options: any) => ref.set(data, options),
            update: async (ref: any, data: any) => ref.update(data),
            delete: async (ref: any) => ref.delete(),
        };
        try {
            return await updateFunction(tx);
        } catch (err) {
            console.error(`Transaction failed in fallback:`, err);
            throw err;
        }
    }
}

let db: any;
let auth: any;
let FieldValue: any;

if (hasCredentials) {
    const app =
        getApps().length > 0
            ? getApps()[0]
            : initializeApp(
                serviceAccount
                    ? {
                        credential: cert(serviceAccount),
                        projectId: getProjectId(),
                    }
                    : {
                        projectId: getProjectId(),
                    }
            );
    db = getFirestore(app);
    auth = getAuth(app);
    FieldValue = AdminFieldValue;
} else {
    if (process.env.NODE_ENV !== "production") {
        console.warn(`
\x1b[33m⚠️  [VibeXcode] Firebase Admin credentials are not configured!
Falling back to local MongoDB / Mongoose database simulation.
All backend reads/writes will be stored in MongoDB.\x1b[0m
`);
    }

    db = new MongooseFirestoreShim();
    auth = new Proxy({} as any, {
        get(target: any, prop: string | symbol) {
            if (prop === "then" || prop === "toJSON") return undefined;
            throw new Error(
                `❌ [VibeXcode] Failed to access Firebase Auth: Service account credentials are not configured and Auth is not mocked.`
            );
        }
    });
    FieldValue = MockFieldValue;
}

export { auth, db, FieldValue, Timestamp };
