import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import axios from "axios";

import { AuthLayout } from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Divider } from "../components/ui/Divider";
import { PasswordInput } from "../components/auth/PasswordInput";

import { loginSchema } from "../lib/validation/authSchemas";
import api from "../lib/api";
import { showError, showSuccess, showWarning } from "../lib/popup";

function getFriendlyErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    const message = data?.error || data?.message || data?.detail;

    if (message) return message;

    if (!err.response || err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
      return "Unable to connect to the server. Please check your connection and try again.";
    }
  }

  return "Unable to connect to the server. Please check your connection and try again.";
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ gmail: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<{
    gmail?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    try {
      const res = await api.post("/auth/google", { idToken: cred.credential });

      if (res.data.token) {
        localStorage.setItem("readify_token", res.data.token);
        showSuccess("Logged in successfully.");
        navigate("/feed");
        return;
      }

      if (res.data.needsUsername) {
        showWarning("Complete your Google signup by choosing a username.");
        navigate("/signup/complete-profile", {
          state: {
            pendingToken: res.data.pendingToken,
            name: res.data.name,
            email: res.data.gmail,
          },
        });
      }
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setServerError(message);
      showError(message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const validation = loginSchema.safeParse(form);
    if (!validation.success) {
      const formattedErrors: { gmail?: string; password?: string } = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0] === "gmail") formattedErrors.gmail = issue.message;
        if (issue.path[0] === "password")
          formattedErrors.password = issue.message;
      });
      setFieldErrors(formattedErrors);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login", form);
      const { token } = res.data;

      if (token) localStorage.setItem("readify_token", token);
      showSuccess("Logged in successfully.");
      navigate("/");
    } catch (err: unknown) {
      const message = getFriendlyErrorMessage(err);
      setServerError(message);
      showError(message);
    } finally {
      setLoading(false);
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
          name="gmail"
          placeholder="you@example.com"
          value={form.gmail}
          onChange={handleChange}
          error={fieldErrors.gmail}
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

        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => {
            const message = "Unable to connect to the server. Please check your connection and try again.";
            setServerError(message);
            showError(message);
          }}
          useOneTap
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
