import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { Game, GameDistribution } from "../types";

export function PickDistribution({ weekId, games }: { weekId: string; games: Game[] }) {
  const [distribution, setDistribution] = useState<GameDistribution[] | null>(null);

  useEffect(() => {
    apiFetch<GameDistribution[]>(`/weeks/${weekId}/pick-distribution`)
      .then(setDistribution)
      .catch(() => setDistribution(null));
  }, [weekId]);

  if (!distribution || distribution.length === 0) return null;

  const byGameId = new Map(distribution.map((d) => [d.gameId, d]));
  const chronological = [...games].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  );

  return (
    <div>
      <h3>League pick distribution</h3>
      <p className="muted">Who picked which side, now that picks are locked.</p>
      <ul className="list">
        {chronological.map((game) => {
          const d = byGameId.get(game.id);
          if (!d || d.totalPicks === 0) return null;
          const homePercent = Math.round((d.homeCount / d.totalPicks) * 100);
          const awayPercent = 100 - homePercent;
          return (
            <li key={game.id} className="card">
              <div className="muted" style={{ marginBottom: 6 }}>
                {game.awayTeam} @ {game.homeTeam}
              </div>
              <div className="distribution-bar">
                {awayPercent > 0 && (
                  <div className="distribution-segment away" style={{ width: `${awayPercent}%` }}>
                    {awayPercent}%
                  </div>
                )}
                {homePercent > 0 && (
                  <div className="distribution-segment home" style={{ width: `${homePercent}%` }}>
                    {homePercent}%
                  </div>
                )}
              </div>
              <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                <span className="muted">
                  {game.awayTeam} ({d.awayCount})
                </span>
                <span className="muted">
                  {game.homeTeam} ({d.homeCount})
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
