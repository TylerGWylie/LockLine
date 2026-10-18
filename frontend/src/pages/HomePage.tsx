import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import type { League } from "../types";

export function HomePage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [leagueName, setLeagueName] = useState("");
  const [seasonLabel, setSeasonLabel] = useState(String(new Date().getFullYear()));
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadLeagues() {
    apiFetch<League[]>("/leagues/mine").then(setLeagues).catch((err) => setError(String(err)));
  }

  useEffect(loadLeagues, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/leagues", {
        method: "POST",
        body: JSON.stringify({ name: leagueName, seasonLabel }),
      });
      setLeagueName("");
      loadLeagues();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/leagues/join", { method: "POST", body: JSON.stringify({ inviteCode }) });
      setInviteCode("");
      loadLeagues();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>My leagues</h1>

      {error && <div className="error">{error}</div>}

      {leagues === null ? (
        <p className="muted">Loading…</p>
      ) : leagues.length === 0 ? (
        <p className="muted">You're not in any leagues yet.</p>
      ) : (
        <ul className="list">
          {leagues.map((l) => (
            <li key={l.id} className="card">
              <Link to={`/leagues/${l.id}`}>
                <strong>{l.name}</strong>
              </Link>
              <div className="muted">
                {l.role} · invite code: {l.inviteCode}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Create a league</h2>
      <form className="form" onSubmit={handleCreate}>
        <div>
          <label>League name</label>
          <input value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
        </div>
        <div>
          <label>Season</label>
          <input value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting}>
          Create league
        </button>
      </form>

      <h2>Join a league</h2>
      <form className="form" onSubmit={handleJoin}>
        <div>
          <label>Invite code</label>
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} required />
        </div>
        <button type="submit" disabled={submitting}>
          Join league
        </button>
      </form>
    </div>
  );
}
