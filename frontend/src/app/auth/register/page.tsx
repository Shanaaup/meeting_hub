"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, fullName, password);
      toast.success("Account created!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]" style={{ background: "var(--accent-purple)" }} />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full opacity-10 blur-[150px]" style={{ background: "var(--brand-primary)" }} />

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--gradient-brand)" }}>
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Start analyzing your meetings with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-5 p-8">
          <div>
            <label htmlFor="reg-name" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Full Name</label>
            <input id="reg-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="John Doe" />
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
            <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@company.com" />
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Password</label>
            <div className="relative">
              <input id="reg-password" type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-10" placeholder="Min 6 characters" />
              <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Create Account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-[var(--brand-hover)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
