import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import type { LeagueDetail, Team, Week } from "../types";

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentSeason = league?.seasons.find((s) => s.status !== "complete") ?? league?.seasons[0];

  function loadAll() {
    apiFetch<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((err) => setError(String(err)));
    apiFetch<Team[]>(`/leagues/${leagueId}/teams`).then(setTeams).catch((err) => setError(String(err)));
  }

  useEffect(loadAll, [leagueId]);

  useEffect(() => {
    if (!currentSeason) return;
    apiFetch<Week[]>(`/seasons/${currentSeason.id}/weeks`).then(setWeeks).catch((err) => setError(String(err)));
  }, [currentSeason?.id]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/leagues/${leagueId}/teams`, { method: "POST", body: JSON.stringify({ name: teamName }) });
      setTeamName("");
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinTeam(teamId: string) {
    setError(null);
    try {
      await apiFetch(`/leagues/${leagueId}/teams/${teamId}/join`, { method: "POST", body: "{}" });
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (!league || !teams) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  return (
    <div className="page">
      <p>
        <Link to="/">&larr; My leagues</Link>
      </p>
      <h1>{league.name}</h1>
      <p className="muted">
        Invite code: <strong>{league.inviteCode}</strong> · you are {league.role}
      </p>
      {error && <div className="error">{error}</div>}

      <h2>Teams</h2>
      {teams.length === 0 && <p className="muted">No teams yet.</p>}
      <ul className="list">
        {teams.map((t) => (
          <li key={t.id} className="card">
            <strong>{t.name}</strong>
            <div className="muted">
              {t.memberships?.map((m) => m.user.displayName).join(", ") || "No members"}
            </div>
            {t.myStatus === "active" && <p className="muted">You're on this team.</p>}
            {t.myStatus === "pending" && <p className="muted">Your request to join is pending approval.</p>}
            {!t.myStatus && (
              <button className="secondary" onClick={() => handleJoinTeam(t.id)}>
                Request to join
              </button>
            )}
          </li>
        ))}
      </ul>

      <form className="form" onSubmit={handleCreateTeam}>
        <div>
          <label>New team name</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting}>
          Create team
        </button>
      </form>

      <h2>Weeks</h2>
      {weeks === null ? (
        <p className="muted">Loading…</p>
      ) : (
        (() => {
          const published = weeks.filter((w) => w.status !== "draft");
          return published.length === 0 ? (
            <p className="muted">The commissioner hasn't published a week yet.</p>
          ) : (
            <ul className="list">
              {published.map((w) => (
                <li key={w.id} className="card">
                  <Link to={`/leagues/${leagueId}/weeks/${w.id}`}>
                    <strong>{w.label}</strong>
                  </Link>
                  <div className="muted">{w.status}</div>
                </li>
              ))}
            </ul>
          );
        })()
      )}
    </div>
  );
}
