import { type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "./api";
import "./AdminLogin.css";

async function getResponseError(response: Response, endpoint: string) {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  if (response.status === 404) {
    return `The backend returned 404 for ${endpoint}. Restart the backend from the backend folder to load the current authentication routes.`;
  }
  return body?.message || `The authentication service returned HTTP ${response.status}.`;
}

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/api/auth/me")
      .then(async (response) => {
        if (response.ok) window.location.replace("/admin");
        else if (response.status !== 401) {
          const message = await getResponseError(response, "/api/auth/me");
          if (active) setError(message);
        }
      })
      .catch(() => {
        if (active) setError("The sign-in service could not be reached. Check the backend connection and try again.");
      })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setError(await getResponseError(response, "/api/auth/login"));
        return;
      }
      const result = await response.json().catch(() => null) as { success?: boolean } | null;
      if (!result?.success) {
        setError("The authentication service returned an unexpected response. Please try again.");
        return;
      }
      window.location.replace("/admin");
    } catch {
      setError("The sign-in service is unavailable. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <a className="admin-login-back" href="/">← Back to The Custom Corner</a>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <a className="login-brand" href="/" aria-label="The Custom Corner home">
          <span className="login-brand-mark">CC</span>
          <span>The <b>Custom</b> Corner<small>PERSONALIZED GOODS</small></span>
        </a>
        <div className="login-divider" />
        <div className="admin-login-eyebrow">PRIVATE STORE ACCESS</div>
        <h1 id="admin-login-title">Welcome back</h1>
        <p className="admin-login-intro">Sign in to manage customer orders and their personalized details.</p>

        {error && <div className="admin-login-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-username">Administrator username</label>
          <input
            id="admin-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            maxLength={1024}
            required
          />
          <button className="admin-login-submit" type="submit" disabled={submitting || checkingSession}>
            {submitting ? "SIGNING IN…" : "SIGN IN TO ADMIN"}
          </button>
        </form>
        <p className="admin-login-footnote">Authorized administrators only. Your session expires after 8 hours.</p>
      </section>
      <footer className="admin-login-footer">Made with care · The Custom Corner</footer>
    </main>
  );
}

export default AdminLogin;
