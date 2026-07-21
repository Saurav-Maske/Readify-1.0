import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CredentialResponse } from "@react-oauth/google";

import { AuthLayout } from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Divider } from "../components/ui/Divider";
import { PasswordInput } from "../components/auth/PasswordInput";
import { GoogleButton } from "../components/auth/GoogleButton";

import { loginSchema } from "../lib/validation/authSchemas";
import api from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const validation = loginSchema.safeParse(form);
    if (!validation.success) {
      const formattedErrors: { email?: string; password?: string } = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0] === "email") formattedErrors.email = issue.message;
        if (issue.path[0] === "password")
          formattedErrors.password = issue.message;
      });
      setFieldErrors(formattedErrors);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login", form);
      if (res.data.access) localStorage.setItem("access", res.data.access);
      navigate("/feed");
    } catch (err: any) {
      setServerError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Invalid credentials",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    try {
      const res = await api.post("/auth/google", { token: cred.credential });
      if (res.data.access) localStorage.setItem("access", res.data.access);
      navigate("/feed");
    } catch (err) {
      setServerError("Google authentication failed.");
    }
  };

  return (
    <AuthLayout>
      <div className="text-left mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Start your personalized reading journey.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />

        <PasswordInput
          label="Password"
          name="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-[#4F46E5] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={loading}>
          Log in
        </Button>

        <Divider />

        <GoogleButton
          onButton={handleGoogleSuccess}
          onError={() => setServerError("Google Login failed")}
        />
        {serverError && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {serverError}
          </div>
        )}
      </form>

      <p className="text-center text-xs text-gray-600 mt-6">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-semibold text-[#4F46E5] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
