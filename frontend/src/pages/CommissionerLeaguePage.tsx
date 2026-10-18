import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import type { LeagueDetail, Week } from "../types";

export function CommissionerLeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [weekNumber, setWeekNumber] = useState("1");
  const [weekLabel, setWeekLabel] = useState("Week 1");
  const [submitting, setSubmitting] = useState(false);

  const currentSeason = league?.seasons.find((s) => s.status !== "complete") ?? league?.seasons[0];

  useEffect(() => {
    apiFetch<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((err) => setError(String(err)));
  }, [leagueId]);

  useEffect(() => {
    if (!currentSeason) return;
    apiFetch<Week[]>(`/seasons/${currentSeason.id}/weeks`).then(setWeeks).catch((err) => setError(String(err)));
  }, [currentSeason?.id]);

  async function handleCreateWeek(e: FormEvent) {
    e.preventDefault();
    if (!currentSeason) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/seasons/${currentSeason.id}/weeks`, {
        method: "POST",
        body: JSON.stringify({ weekNumber: Number(weekNumber), label: weekLabel }),
      });
      setWeekNumber(String(Number(weekNumber) + 1));
      setWeekLabel(`Week ${Number(weekNumber) + 1}`);
      apiFetch<Week[]>(`/seasons/${currentSeason.id}/weeks`).then(setWeeks);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!league) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  if (league.role !== "commissioner") {
    return (
      <div className="page">
        <p className="error">You're not the commissioner of this league.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <p>
        <Link to="/commissioner">&larr; League Commissioner</Link>
      </p>
      <h1>{league.name}</h1>
      {error && <div className="error">{error}</div>}

      <h2>Weeks</h2>
      {weeks === null ? (
        <p className="muted">Loading…</p>
      ) : weeks.length === 0 ? (
        <p className="muted">No weeks yet.</p>
      ) : (
        <ul className="list">
          {weeks.map((w) => (
            <li key={w.id} className="card">
              <Link to={`/commissioner/${leagueId}/weeks/${w.id}`}>
                <strong>{w.label}</strong>
              </Link>
              <div className="muted">{w.status}</div>
            </li>
          ))}
        </ul>
      )}

      <h2>Create a week</h2>
      <form className="form" onSubmit={handleCreateWeek}>
        <div>
          <label>Week number</label>
          <input type="number" min={1} value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} required />
        </div>
        <div>
          <label>Label</label>
          <input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting}>
          Create week
        </button>
      </form>
    </div>
  );
}
