import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { League } from "../types";

export function CommissionerLeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<League[]>("/leagues/mine").then(setLeagues).catch((err) => setError(String(err)));
  }, []);

  if (!leagues) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const commissionerLeagues = leagues.filter((l) => l.role === "commissioner");

  return (
    <div className="page">
      <h1>League Commissioner</h1>
      {error && <div className="error">{error}</div>}

      {commissionerLeagues.length === 0 ? (
        <p className="muted">You're not the commissioner of any league.</p>
      ) : (
        <ul className="list">
          {commissionerLeagues.map((l) => (
            <li key={l.id} className="card">
              <Link to={`/commissioner/${l.id}`}>
                <strong>{l.name}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
