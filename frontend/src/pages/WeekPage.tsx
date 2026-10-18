import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { WeekGameplay } from "../components/WeekGameplay";
import type { LeagueDetail, Team, Week } from "../types";

export function WeekPage() {
  const { leagueId, weekId } = useParams<{ leagueId: string; weekId: string }>();
  const { user } = useAuth();
  const [week, setWeek] = useState<Week | null>(null);
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Week>(`/weeks/${weekId}`).then(setWeek).catch((err) => setError(String(err)));
    // Poll so lock status and live scores (updated in the background by server-side
    // cron jobs) show up without requiring a manual page reload.
    const interval = setInterval(() => {
      apiFetch<Week>(`/weeks/${weekId}`).then(setWeek).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [weekId]);
  useEffect(() => {
    apiFetch<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((err) => setError(String(err)));
    apiFetch<Team[]>(`/leagues/${leagueId}/teams`).then(setTeams).catch((err) => setError(String(err)));
  }, [leagueId]);

  if (!week || !league || !teams) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const myTeam = teams.find((t) => t.memberships?.some((m) => m.userId === user?.id));

  return (
    <div className="page">
      <p>
        <Link to={`/leagues/${leagueId}`}>&larr; {league.name}</Link>
      </p>
      <h1>{week.label}</h1>
      <p className="muted">Status: {week.status}</p>
      {error && <div className="error">{error}</div>}

      <WeekGameplay leagueId={leagueId!} week={week} myTeam={myTeam} />
    </div>
  );
}
