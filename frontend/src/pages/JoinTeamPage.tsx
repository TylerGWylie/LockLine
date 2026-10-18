import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { JoinLeagueForm } from "../components/JoinLeagueForm";
import { LeagueTeamPicker } from "../components/LeagueTeamPicker";
import type { League } from "../types";

export function JoinTeamPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadLeagues() {
    apiFetch<League[]>("/leagues/mine").then(setLeagues).catch((err) => setError(String(err)));
  }

  useEffect(loadLeagues, []);

  return (
    <div className="page">
      <h1>Join another team</h1>
      {error && <div className="error">{error}</div>}

      {leagues?.map((l) => (
        <LeagueTeamPicker key={l.id} league={l} onChange={() => {}} />
      ))}

      <JoinLeagueForm onJoined={loadLeagues} />
    </div>
  );
}
