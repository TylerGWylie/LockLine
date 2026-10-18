import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import type { League, Team } from "../types";

export function LeagueTeamPicker({ league, onChange }: { league: League; onChange: () => void }) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<Team[]>(`/leagues/${league.id}/teams`).then(setTeams).catch((err) => setError(String(err)));
  }

  useEffect(load, [league.id]);

  async function handleJoin(teamId: string) {
    setError(null);
    try {
      await apiFetch(`/leagues/${league.id}/teams/${teamId}/join`, { method: "POST", body: "{}" });
      load();
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (!teams) return <p className="muted">Loading teams for {league.name}…</p>;

  return (
    <div className="card">
      <strong>{league.name}</strong>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {teams.map((t) => (
          <li key={t.id} className="row" style={{ justifyContent: "space-between" }}>
            <span>{t.name}</span>
            {t.myStatus === "pending" ? (
              <span className="muted">Pending approval</span>
            ) : !t.myStatus ? (
              <button className="secondary" onClick={() => handleJoin(t.id)}>
                Request to join
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
