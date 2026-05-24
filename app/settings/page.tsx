"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { sendPasswordResetEmail, getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Settings as SettingsIcon, KeyRound, Bell, Code2 } from "lucide-react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import type { RootState } from "../store/store";

interface Preferences {
  defaultLanguage: "Javascript" | "Python" | "Java" | "C++";
  theme: "light" | "dark" | "auto";
  soundEnabled: boolean;
  showDifficulty: boolean;
}

const DEFAULT_PREFS: Preferences = {
  defaultLanguage: "Javascript",
  theme: "auto",
  soundEnabled: true,
  showDifficulty: true,
};

const SettingsPage = () => {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const email = userData?.email?.toLowerCase() || null;

  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const [resetSending, setResetSending] = useState(false);
  const [resetSentAt, setResetSentAt] = useState<Date | null>(null);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !email) {
      setLoading(false);
      return;
    }
    fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.profile?.preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...d.profile.preferences });
        }
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, email]);

  const savePrefs = async (next: Preferences) => {
    if (!email) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, preferences: next }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updatePref = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  };

  const sendPasswordReset = async () => {
    if (!email) return;
    setResetSending(true);
    setResetError("");
    try {
      await sendPasswordResetEmail(getAuth(app), email);
      setResetSentAt(new Date());
    } catch (e) {
      setResetError(
        e instanceof Error ? e.message : "Failed to send reset email"
      );
    } finally {
      setResetSending(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Log in to view settings</h1>
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to login →
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-7 h-7 text-purple-600" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Account */}
            <section className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" /> Account
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Logged in as <strong>{email}</strong>
              </p>
              <button
                onClick={sendPasswordReset}
                disabled={resetSending}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                {resetSending ? "Sending..." : "Send password reset email"}
              </button>
              {resetSentAt && !resetError && (
                <p className="text-xs text-green-600 mt-2">
                  Sent — check your inbox at {email}.
                </p>
              )}
              {resetError && (
                <p className="text-xs text-red-500 mt-2">{resetError}</p>
              )}
            </section>

            {/* Preferences */}
            <section className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" /> Playground
              </h2>

              <Row label="Default language">
                <select
                  value={prefs.defaultLanguage}
                  onChange={(e) =>
                    updatePref(
                      "defaultLanguage",
                      e.target.value as Preferences["defaultLanguage"]
                    )
                  }
                  className="px-3 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-sm"
                >
                  <option value="Javascript">JavaScript</option>
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="C++">C++</option>
                </select>
              </Row>

              <Row label="Show difficulty badges">
                <Toggle
                  checked={prefs.showDifficulty}
                  onChange={(v) => updatePref("showDifficulty", v)}
                />
              </Row>
            </section>

            <section className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" /> Notifications
              </h2>
              <Row label="Sound effects">
                <Toggle
                  checked={prefs.soundEnabled}
                  onChange={(v) => updatePref("soundEnabled", v)}
                />
              </Row>
            </section>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </p>
            )}
            {saving && (
              <p className="text-xs text-gray-400 text-right">Saving...</p>
            )}
            {!saving && savedAt && !error && (
              <p className="text-xs text-green-600 text-right">
                Saved {savedAt.toLocaleTimeString()}.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
    {children}
  </div>
);

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition ${
      checked ? "bg-blue-600" : "bg-gray-300 dark:bg-zinc-600"
    }`}
    role="switch"
    aria-checked={checked}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

export default SettingsPage;
