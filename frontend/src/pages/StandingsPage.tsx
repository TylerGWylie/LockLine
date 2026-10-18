import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { SeasonStandingRow, Team, Week, WeekStandingRow } from "../types";

const MEDALS = ["🥇", "🥈", "🥉"];

function StandingsTable({
  rows,
  myTeamId,
  showPossible,
}: {
  rows: { teamId: string; teamName: string; points: number; pointsPossible?: number }[];
  myTeamId: string | null;
  showPossible: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Points</th>
            {showPossible && <th>Possible</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.teamId} className={row.teamId === myTeamId ? "my-team-row" : undefined}>
              <td>{MEDALS[index] ?? index + 1}</td>
              <td>{row.teamName}</td>
              <td>{row.points}</td>
              {showPossible && <td>{row.pointsPossible}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsPage() {
  const { leagueId, weekId } = useParams<{ leagueId: string; weekId: string }>();
  const [week, setWeek] = useState<Week | null>(null);
  const [weekStandings, setWeekStandings] = useState<WeekStandingRow[] | null>(null);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStandingRow[] | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Week>(`/weeks/${weekId}`).then(setWeek).catch((err) => setError(String(err)));
    apiFetch<WeekStandingRow[]>(`/weeks/${weekId}/standings`)
      .then(setWeekStandings)
      .catch((err) => setError(String(err)));
  }, [weekId]);

  useEffect(() => {
    apiFetch<Team[]>("/teams/mine")
      .then((teams) => setMyTeamId(teams.find((t) => t.leagueId === leagueId)?.id ?? null))
      .catch(() => {});
  }, [leagueId]);

  useEffect(() => {
    if (!week?.season) return;
    apiFetch<SeasonStandingRow[]>(`/seasons/${week.season.id}/standings`)
      .then(setSeasonStandings)
      .catch((err) => setError(String(err)));
  }, [week?.season?.id]);

  return (
    <div className="page">
      <p>
        <Link to={`/leagues/${leagueId}/weeks/${weekId}`}>&larr; {week?.label ?? "Week"}</Link>
      </p>
      <h1>Standings</h1>
      {error && <div className="error">{error}</div>}

      <h2>This week</h2>
      {weekStandings === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <StandingsTable rows={weekStandings} myTeamId={myTeamId} showPossible />
      )}

      <h2>Season</h2>
      {seasonStandings === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <StandingsTable rows={seasonStandings} myTeamId={myTeamId} showPossible={false} />
      )}

      <p>
        <Link to={`/leagues/${leagueId}/weeks/${weekId}/whatif`}>See what-if standings &rarr;</Link>
      </p>
    </div>
  );
}
