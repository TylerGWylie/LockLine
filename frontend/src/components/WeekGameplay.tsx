import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PickDistribution } from "./PickDistribution";
import { PicksRanker } from "./PicksRanker";
import type { Team, Week } from "../types";

function LockCountdown({ lockAt }: { lockAt: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const diffMs = new Date(lockAt).getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return <p className="muted">Picks lock in {label}</p>;
}

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
      <div className="row" style={{ margin: "16px 0" }}>
        <Link to={`/leagues/${leagueId}/weeks/${week.id}/standings`}>Standings</Link>
        <Link to={`/leagues/${leagueId}/weeks/${week.id}/whatif`}>What-if</Link>
      </div>

      {week.status === "published" && week.lockAt && <LockCountdown lockAt={week.lockAt} />}

      <h2>Your picks{myTeam ? ` — ${myTeam.name}` : ""}</h2>
      {myTeam ? (
        <PicksRanker weekId={week.id} teamId={myTeam.id} games={games} locked={locked} />
      ) : (
        <p className="muted">
          Join a team on the <Link to={`/leagues/${leagueId}`}>league page</Link> first.
        </p>
      )}

      {locked && <PickDistribution weekId={week.id} games={games} />}
    </>
  );
}
