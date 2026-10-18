import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { SeasonStandingRow, Week, WeekStandingRow } from "../types";

export function StandingsPage() {
  const { leagueId, weekId } = useParams<{ leagueId: string; weekId: string }>();
  const [week, setWeek] = useState<Week | null>(null);
  const [weekStandings, setWeekStandings] = useState<WeekStandingRow[] | null>(null);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStandingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Week>(`/weeks/${weekId}`).then(setWeek).catch((err) => setError(String(err)));
    apiFetch<WeekStandingRow[]>(`/weeks/${weekId}/standings`)
      .then(setWeekStandings)
      .catch((err) => setError(String(err)));
  }, [weekId]);

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
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Points</th>
              <th>Possible</th>
            </tr>
          </thead>
          <tbody>
            {weekStandings.map((row) => (
              <tr key={row.teamId}>
                <td>{row.teamName}</td>
                <td>{row.points}</td>
                <td>{row.pointsPossible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Season</h2>
      {seasonStandings === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {seasonStandings.map((row) => (
              <tr key={row.teamId}>
                <td>{row.teamName}</td>
                <td>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p>
        <Link to={`/leagues/${leagueId}/weeks/${weekId}/whatif`}>See what-if standings &rarr;</Link>
      </p>
    </div>
  );
}
