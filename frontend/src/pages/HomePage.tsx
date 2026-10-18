import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import { JoinLeagueForm } from "../components/JoinLeagueForm";
import { LeagueTeamPicker } from "../components/LeagueTeamPicker";
import { WeekGameplay } from "../components/WeekGameplay";
import type { League, Team, Week } from "../types";

export function HomePage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  function loadTeams() {
    apiFetch<Team[]>("/teams/mine").then(setTeams).catch((err) => setError(String(err)));
  }

  function loadLeagues() {
    apiFetch<League[]>("/leagues/mine").then(setLeagues).catch((err) => setError(String(err)));
  }

  useEffect(loadTeams, []);

  useEffect(() => {
    if (teams === null || teams.length > 0) return;
    loadLeagues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const primaryTeam = teams && teams.length === 1 ? teams[0] : undefined;

  useEffect(() => {
    if (!primaryTeam) return;
    setCurrentWeek(undefined);
    apiFetch<Week>(`/leagues/${primaryTeam.leagueId}/current-week`)
      .then(setCurrentWeek)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setCurrentWeek(null);
        } else {
          setError(String(err));
        }
      });
  }, [primaryTeam?.leagueId]);

  if (teams === null) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  if (teams.length === 0) {
    if (leagues === null) {
      return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
    }
    return (
      <div className="page">
        <h1>Welcome</h1>
        {error && <div className="error">{error}</div>}
        {leagues.length === 0 ? (
          <JoinLeagueForm onJoined={loadLeagues} />
        ) : (
          <>
            <p className="muted">Pick a team to get started:</p>
            {leagues.map((l) => (
              <LeagueTeamPicker key={l.id} league={l} onChange={loadTeams} />
            ))}
          </>
        )}
      </div>
    );
  }

  if (teams.length > 1) {
    return (
      <div className="page">
        <h1>Your teams</h1>
        {error && <div className="error">{error}</div>}
        <ul className="list">
          {teams.map((t) => (
            <li key={t.id} className="card">
              <Link to={`/leagues/${t.leagueId}`}>
                <strong>{t.name}</strong> — {t.leagueName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>
        <Link to={`/leagues/${primaryTeam!.leagueId}`}>{primaryTeam!.leagueName}</Link>
      </h1>
      {error && <div className="error">{error}</div>}
      {currentWeek === undefined ? (
        <p className="muted">Loading…</p>
      ) : currentWeek === null ? (
        <p className="muted">No week has been set up yet. Check back once the commissioner publishes one.</p>
      ) : (
        <WeekGameplay leagueId={primaryTeam!.leagueId} week={currentWeek} myTeam={primaryTeam} />
      )}
    </div>
  );
}
