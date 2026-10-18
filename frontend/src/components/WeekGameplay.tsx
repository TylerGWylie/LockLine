import { Link } from "react-router-dom";
import { PicksRanker } from "./PicksRanker";
import type { Team, Week } from "../types";

export function WeekGameplay({
  leagueId,
  week,
  myTeam,
}: {
  leagueId: string;
  week: Week;
  myTeam: Team | undefined;
}) {
  const locked = week.status === "locked" || week.status === "graded";
  const games = week.games ?? [];

  if (week.status === "draft") {
    return <p className="muted">The commissioner hasn't published this week yet.</p>;
  }

  return (
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
        <Link to={`/leagues/${leagueId}/weeks/${week.id}/standings`}>Standings</Link>
        <Link to={`/leagues/${leagueId}/weeks/${week.id}/whatif`}>What-if</Link>
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
  );
}
