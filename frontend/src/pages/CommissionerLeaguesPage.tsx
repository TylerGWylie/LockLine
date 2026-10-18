import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import type { League } from "../types";

export function CommissionerLeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [leagueName, setLeagueName] = useState("");
  const [seasonLabel, setSeasonLabel] = useState(String(new Date().getFullYear()));
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

  if (!leagues) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const commissionerLeagues = leagues.filter((l) => l.role === "commissioner");

  return (
    <div className="page">
      <h1>League Commissioner</h1>
      {error && <div className="error">{error}</div>}

      {commissionerLeagues.length === 0 ? (
        <p className="muted">You're not the commissioner of any league yet.</p>
      ) : (
        <ul className="list">
          {commissionerLeagues.map((l) => (
            <li key={l.id} className="card">
              <Link to={`/commissioner/${l.id}`}>
                <strong>{l.name}</strong>
              </Link>
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
    </div>
  );
}
