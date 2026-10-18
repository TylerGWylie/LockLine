import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PicksRanker } from "../components/PicksRanker";
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
  }, [weekId]);
  useEffect(() => {
    apiFetch<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((err) => setError(String(err)));
    apiFetch<Team[]>(`/leagues/${leagueId}/teams`).then(setTeams).catch((err) => setError(String(err)));
  }, [leagueId]);

  if (!week || !league || !teams) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const myTeam = teams.find((t) => t.memberships?.some((m) => m.userId === user?.id));
  const locked = week.status === "locked" || week.status === "graded";
  const games = week.games ?? [];

  return (
    <div className="page">
      <p>
        <Link to={`/leagues/${leagueId}`}>&larr; {league.name}</Link>
      </p>
      <h1>{week.label}</h1>
      <p className="muted">Status: {week.status}</p>
      {error && <div className="error">{error}</div>}

      {week.status === "draft" ? (
        <p className="muted">The commissioner hasn't published this week yet.</p>
      ) : (
        <>
          <h2>Games</h2>
          <table>
            <thead>
              <tr>
                <th>Matchup</th>
                <th>Line</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.awayTeam} @ {g.homeTeam}
                  </td>
                  <td>
                    {g.favoriteTeam === "home" ? g.homeTeam : g.awayTeam} -{g.spreadValue}
                  </td>
                  <td>{g.homeScore !== null ? `${g.awayScore} - ${g.homeScore}` : "—"}</td>
                  <td>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row" style={{ margin: "16px 0" }}>
            <Link to={`/leagues/${leagueId}/weeks/${weekId}/standings`}>Standings</Link>
            <Link to={`/leagues/${leagueId}/weeks/${weekId}/whatif`}>What-if</Link>
          </div>

          <h2>Your picks{myTeam ? ` — ${myTeam.name}` : ""}</h2>
          {myTeam ? (
            <PicksRanker weekId={week.id} teamId={myTeam.id} games={games} locked={locked} />
          ) : (
            <p className="muted">
              Join a team on the <Link to={`/leagues/${leagueId}`}>league page</Link> first.
            </p>
          )}
        </>
      )}
    </div>
  );
}
