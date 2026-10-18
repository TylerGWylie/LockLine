import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { LeagueDetail, Team, Week } from "../types";

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [weekLabel, setWeekLabel] = useState("Week 1");
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

  if (!league || !teams) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const myTeamIds = new Set(
    teams.filter((t) => t.memberships?.some((m) => m.userId === user?.id)).map((t) => t.id),
  );

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
            <div className="muted">{t.memberships?.map((m) => m.user.displayName).join(", ") || "No members"}</div>
            {!myTeamIds.has(t.id) && (
              <button className="secondary" onClick={() => handleJoinTeam(t.id)}>
                Join this team
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
      ) : weeks.length === 0 ? (
        <p className="muted">No weeks yet.</p>
      ) : (
        <ul className="list">
          {weeks.map((w) => (
            <li key={w.id} className="card">
              <Link to={`/leagues/${leagueId}/weeks/${w.id}`}>
                <strong>{w.label}</strong>
              </Link>
              <div className="muted">{w.status}</div>
            </li>
          ))}
        </ul>
      )}

      {league.role === "commissioner" && (
        <>
          <h2>Create a week</h2>
          <form className="form" onSubmit={handleCreateWeek}>
            <div>
              <label>Week number</label>
              <input
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Label</label>
              <input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} required />
            </div>
            <button type="submit" disabled={submitting}>
              Create week
            </button>
          </form>
        </>
      )}
    </div>
  );
}
