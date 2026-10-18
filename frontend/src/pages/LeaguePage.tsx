import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { JoinRequest, LeagueDetail, Team, Week } from "../types";

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [weekLabel, setWeekLabel] = useState("Week 1");
  const [submitting, setSubmitting] = useState(false);

  const currentSeason = league?.seasons.find((s) => s.status !== "complete") ?? league?.seasons[0];

  function loadAll() {
    apiFetch<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((err) => setError(String(err)));
    apiFetch<Team[]>(`/leagues/${leagueId}/teams`).then(setTeams).catch((err) => setError(String(err)));
  }

  useEffect(loadAll, [leagueId]);

  useEffect(() => {
    if (!currentSeason) return;
    apiFetch<Week[]>(`/seasons/${currentSeason.id}/weeks`).then(setWeeks).catch((err) => setError(String(err)));
  }, [currentSeason?.id]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/leagues/${leagueId}/teams`, { method: "POST", body: JSON.stringify({ name: teamName }) });
      setTeamName("");
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinTeam(teamId: string) {
    setError(null);
    try {
      await apiFetch(`/leagues/${leagueId}/teams/${teamId}/join`, { method: "POST", body: "{}" });
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function handleCreateWeek(e: FormEvent) {
    e.preventDefault();
    if (!currentSeason) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/seasons/${currentSeason.id}/weeks`, {
        method: "POST",
        body: JSON.stringify({ weekNumber: Number(weekNumber), label: weekLabel }),
      });
      setWeekNumber(String(Number(weekNumber) + 1));
      setWeekLabel(`Week ${Number(weekNumber) + 1}`);
      apiFetch<Week[]>(`/seasons/${currentSeason.id}/weeks`).then(setWeeks);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!league || !teams) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  return (
    <div className="page">
      <p>
        <Link to="/">&larr; My leagues</Link>
      </p>
      <h1>{league.name}</h1>
      <p className="muted">
        Invite code: <strong>{league.inviteCode}</strong> · you are {league.role}
      </p>
      {error && <div className="error">{error}</div>}

      <h2>Teams</h2>
      {teams.length === 0 && <p className="muted">No teams yet.</p>}
      <ul className="list">
        {teams.map((t) => (
          <TeamCard
            key={t.id}
            leagueId={leagueId!}
            team={t}
            isCreator={t.createdByUserId === user?.id}
            onJoin={() => handleJoinTeam(t.id)}
            onChange={loadAll}
          />
        ))}
      </ul>

      <form className="form" onSubmit={handleCreateTeam}>
        <div>
          <label>New team name</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting}>
          Create team
        </button>
      </form>

      <h2>Weeks</h2>
      {weeks === null ? (
        <p className="muted">Loading…</p>
      ) : weeks.length === 0 ? (
        <p className="muted">No weeks yet.</p>
      ) : (
        <ul className="list">
          {weeks.map((w) => (
            <li key={w.id} className="card">
              <Link to={`/leagues/${leagueId}/weeks/${w.id}`}>
                <strong>{w.label}</strong>
              </Link>
              <div className="muted">{w.status}</div>
            </li>
          ))}
        </ul>
      )}

      {league.role === "commissioner" && (
        <>
          <h2>Create a week</h2>
          <form className="form" onSubmit={handleCreateWeek}>
            <div>
              <label>Week number</label>
              <input
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Label</label>
              <input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} required />
            </div>
            <button type="submit" disabled={submitting}>
              Create week
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function TeamCard({
  leagueId,
  team,
  isCreator,
  onJoin,
  onChange,
}: {
  leagueId: string;
  team: Team;
  isCreator: boolean;
  onJoin: () => void;
  onChange: () => void;
}) {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreator) return;
    apiFetch<JoinRequest[]>(`/leagues/${leagueId}/teams/${team.id}/join-requests`)
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requests"));
  }, [isCreator, leagueId, team.id]);

  async function respond(userId: string, action: "approve" | "reject") {
    setError(null);
    try {
      await apiFetch(`/leagues/${leagueId}/teams/${team.id}/join-requests/${userId}/${action}`, {
        method: "POST",
      });
      setRequests((current) => current?.filter((r) => r.userId !== userId) ?? null);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <li className="card">
      <strong>{team.name}</strong>
      <div className="muted">
        {team.memberships?.map((m) => m.user.displayName).join(", ") || "No members"}
      </div>
      {error && <div className="error">{error}</div>}

      {team.myStatus === "active" && <p className="muted">You're on this team.</p>}
      {team.myStatus === "pending" && <p className="muted">Your request to join is pending approval.</p>}
      {!team.myStatus && (
        <button className="secondary" onClick={onJoin}>
          Request to join
        </button>
      )}

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
    </li>
  );
}
