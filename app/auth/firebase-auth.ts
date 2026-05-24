"use client";

/**
 * Firebase-backed AuthService.
 *
 * Replaces the previous Appwrite-backed implementation in
 * `app/appwrite/auth.ts`. The public surface (signUp/signIn/checkUser/
 * logout/sendPasswordReset/updatePassword) returns a simple AuthUser
 * shape (`$id`, `name`, `email`, `emailVerification`) so existing call
 * sites that destructure those fields keep working without changes.
 *
 * On signUp/signIn we also POST to /api/signup so a corresponding Mongo
 * Users record exists. The Mongo record uses `firebaseUid` as the
 * external identity link.
 */

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { app } from "@/lib/firebase";

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  emailVerification?: boolean;
}

function toAuthUser(u: FirebaseUser): AuthUser {
  return {
    $id: u.uid,
    email: u.email || "",
    name: u.displayName || (u.email ? u.email.split("@")[0] : "User"),
    emailVerification: u.emailVerified,
  };
}

async function ensureMongoUser(opts: {
  firebaseUid: string;
  email: string;
  username: string;
}): Promise<void> {
  try {
    await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    // /api/signup is idempotent on existing user (returns 409) — that's fine.
  } catch (e) {
    console.warn("Failed to sync Mongo user record (non-blocking):", e);
  }
}

class FirebaseAuthService {
  private get auth() {
    return getAuth(app);
  }

  async signUp(
    email: string,
    password: string,
    name: string
  ): Promise<AuthUser> {
    const cred = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    if (name) {
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch {
        // Non-fatal — display name is just a nicety.
      }
    }
    const user = toAuthUser(cred.user);
    await ensureMongoUser({
      firebaseUid: cred.user.uid,
      email: user.email,
      username: name || email.split("@")[0],
    });
    return user;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const user = toAuthUser(cred.user);
    // Best-effort: make sure Mongo has a record for this user too.
    await ensureMongoUser({
      firebaseUid: cred.user.uid,
      email: user.email,
      username: user.name,
    });
    return user;
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut(this.auth);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async checkUser(): Promise<AuthUser | null> {
    // Wait for Firebase to resolve the initial auth state, then resolve once.
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(this.auth, (u) => {
        unsub();
        resolve(u ? toAuthUser(u) : null);
      });
    });
  }

  async isAuthenticated(): Promise<boolean> {
    return (await this.checkUser()) !== null;
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  // Firebase uses an oobCode (from the password-reset email link) rather than
  // a separate userId. We accept the legacy `userId` param for API parity
  // with the old AuthServiceContract but ignore it.
  async updatePassword(
    _userId: string,
    secret: string,
    newPassword: string
  ): Promise<{ $id: string }> {
    await confirmPasswordReset(this.auth, secret, newPassword);
    return { $id: _userId };
  }
}

const authservice = new FirebaseAuthService();
export default authservice;
export { FirebaseAuthService };
