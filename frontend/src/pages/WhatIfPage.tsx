import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import {
  computeSeasonStandings,
  computeWeekStandings,
  type HypotheticalOutcomes,
  type WhatIfData,
} from "../features/whatif/computeStandings";

export function WhatIfPage() {
  const { leagueId, weekId } = useParams<{ leagueId: string; weekId: string }>();
  const [data, setData] = useState<WhatIfData | null>(null);
  const [hypotheses, setHypotheses] = useState<HypotheticalOutcomes>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<WhatIfData>(`/weeks/${weekId}/whatif-data`).then(setData).catch((err) => setError(String(err)));
  }, [weekId]);

  if (!data) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const unresolvedGames = data.games.filter((g) => g.status !== "final" && g.status !== "void");
  const weekStandings = computeWeekStandings(data, hypotheses);
  const seasonStandings = computeSeasonStandings(data, hypotheses);

  function setHypothesis(gameId: string, side: "home" | "away") {
    setHypotheses((current) => ({ ...current, [gameId]: side }));
  }

  return (
    <div className="page">
      <p>
        <Link to={`/leagues/${leagueId}/weeks/${weekId}`}>&larr; Back to week</Link>
      </p>
      <h1>What if…</h1>
      {error && <div className="error">{error}</div>}
      <p className="muted">
        Toggle who covers in the games that haven't finished yet, and see how the standings would
        shake out.
      </p>

      {unresolvedGames.length === 0 ? (
        <p className="muted">Every game this week is already final.</p>
      ) : (
        <ul className="list">
          {unresolvedGames.map((g) => {
            const game = data.games.find((x) => x.id === g.id)!;
            const chosen = hypotheses[g.id];
            return (
              <li key={g.id} className="card row" style={{ justifyContent: "space-between" }}>
                <span>
                  Game {g.id.slice(0, 6)} — favored side {game.favoriteTeam} by {game.spreadValue}
                </span>
                <span className="row">
                  <button
                    className={chosen === "home" ? "" : "secondary"}
                    onClick={() => setHypothesis(g.id, "home")}
                  >
                    Home covers
                  </button>
                  <button
                    className={chosen === "away" ? "" : "secondary"}
                    onClick={() => setHypothesis(g.id, "away")}
                  >
                    Away covers
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <h2>Hypothetical week standings</h2>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Points</th>
            <th>Possible</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {weekStandings.map((row) => (
            <tr key={row.teamId}>
              <td>{row.teamName}</td>
              <td>{row.points}</td>
              <td>{row.pointsPossible}</td>
              <td className="muted">{row.complete ? "" : "provisional"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Hypothetical season standings</h2>
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
    </div>
  );
}
