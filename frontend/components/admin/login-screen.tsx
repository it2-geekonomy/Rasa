"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { writeAdminSession, type AdminUser } from "@/lib/admin/session";
import { fieldClass, labelClass, Notice, primaryButtonClass } from "./ui";

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@rasafest.org");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{ data: { accessToken: string; user: AdminUser } }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      writeAdminSession({ token: result.data.accessToken, user: result.data.user });
      router.replace("/admin");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-tint px-4">
      <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-rasa border border-line bg-white p-6">
        <div>
          <p className="font-lab text-xs tracking-[0.16em] text-plum uppercase">RASA staff</p>
          <h1 className="font-display text-3xl text-plum">Admin login</h1>
        </div>
        <label className={labelClass}>
          Email
          <input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className={labelClass}>
          Password
          <input className={fieldClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        </label>
        {error ? <Notice>{error}</Notice> : null}
        <button className={primaryButtonClass} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
