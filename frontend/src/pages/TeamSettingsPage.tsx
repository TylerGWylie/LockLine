import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch, ApiError } from "../api/client";
import type { JoinRequest, Team } from "../types";

export function TeamSettingsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadTeams() {
    apiFetch<Team[]>("/teams/mine").then(setTeams).catch((err) => setError(String(err)));
  }

  useEffect(loadTeams, []);

  if (!teams) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  return (
    <div className="page">
      <h1>Team Settings</h1>
      {error && <div className="error">{error}</div>}

      {teams.length === 0 ? (
        <p className="muted">You're not on any teams yet.</p>
      ) : (
        teams.map((t) => <TeamSettingsCard key={t.id} team={t} onChange={loadTeams} />)
      )}
    </div>
  );
}

function TeamSettingsCard({ team, onChange }: { team: Team; onChange: () => void }) {
  const { user } = useAuth();
  const isCreator = team.createdByUserId === user?.id;

  const [name, setName] = useState(team.name);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreator) return;
    apiFetch<JoinRequest[]>(`/leagues/${team.leagueId}/teams/${team.id}/join-requests`)
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requests"));
  }, [isCreator, team.leagueId, team.id]);

  async function handleRename() {
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/teams/${team.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rename team");
    } finally {
      setSaving(false);
    }
  }

  async function respond(userId: string, action: "approve" | "reject") {
    setError(null);
    try {
      await apiFetch(`/leagues/${team.leagueId}/teams/${team.id}/join-requests/${userId}/${action}`, {
        method: "POST",
      });
      setRequests((current) => current?.filter((r) => r.userId !== userId) ?? null);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="card">
      <div className="muted">{team.leagueName}</div>
      {error && <div className="error">{error}</div>}

      {isCreator ? (
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={handleRename} disabled={saving || name === team.name}>
            Save name
          </button>
        </div>
      ) : (
        <strong>{team.name}</strong>
      )}

      <div className="muted" style={{ marginTop: 8 }}>
        Members: {team.memberships?.map((m) => m.user.displayName).join(", ") || "No members"}
      </div>

      {isCreator && requests && requests.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong className="muted">Pending requests</strong>
          <ul className="list">
            {requests.map((r) => (
              <li key={r.userId} className="row" style={{ justifyContent: "space-between" }}>
                <span>{r.user.displayName}</span>
                <span className="row">
                  <button onClick={() => respond(r.userId, "approve")}>Approve</button>
                  <button className="danger" onClick={() => respond(r.userId, "reject")}>
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
