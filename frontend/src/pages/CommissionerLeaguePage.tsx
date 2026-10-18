import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import { ShareLink } from "../components/ShareLink";
import type { LeagueDetail, Week } from "../types";

export function CommissionerLeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentSeason = league?.seasons.find((s) => s.status !== "complete") ?? league?.seasons[0];

  useEffect(() => {
    apiFetch<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((err) => setError(String(err)));
  }, [leagueId]);

  function loadWeeks() {
    if (!currentSeason) return;
    apiFetch<Week[]>(`/seasons/${currentSeason.id}/weeks`).then(setWeeks).catch((err) => setError(String(err)));
  }

  useEffect(loadWeeks, [currentSeason?.id]);

  async function handleRemoveWeek(week: Week) {
    if (!window.confirm(`Remove ${week.label}? The league won't compete that week.`)) return;
    setError(null);
    try {
      await apiFetch(`/weeks/${week.id}`, { method: "DELETE" });
      loadWeeks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove week");
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

      <h2>Share link to join</h2>
      <p className="muted">Anyone with this link can join {league.name} and request a team.</p>
      <ShareLink url={`${window.location.origin}/join/${league.inviteCode}`} />

      <h2>Weeks</h2>
      <p className="muted">
        The season's weeks (Thursday–Wednesday, first college week through the Super Bowl) are
        created automatically. Remove any week the league won't be competing — for example, to end
        the season early instead of running through the Super Bowl.
      </p>
      {weeks === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul className="list">
          {weeks.map((w) => (
            <li key={w.id} className="card row" style={{ justifyContent: "space-between" }}>
              <Link to={`/commissioner/${leagueId}/weeks/${w.id}`}>
                <strong>{w.label}</strong>
                <span className="muted"> — {w.status}</span>
              </Link>
              {w.status === "draft" && (
                <button className="danger" onClick={() => handleRemoveWeek(w)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
