import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { InvitePreview } from "../types";

export function JoinInvitePage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get("team");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    apiFetch<InvitePreview>(`/invite/${code}`)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Invalid invite link"));
  }, [code]);

  if (authLoading || preview === null) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const targetTeam = preview.teams.find((t) => t.id === teamId);
  const here = `/join/${code}${teamId ? `?team=${teamId}` : ""}`;

  async function handleJoin() {
    setError(null);
    setJoining(true);
    try {
      await apiFetch("/leagues/join", { method: "POST", body: JSON.stringify({ inviteCode: code }) });
      if (targetTeam) {
        await apiFetch(`/leagues/${preview!.id}/teams/${targetTeam.id}/join`, {
          method: "POST",
          body: "{}",
        });
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page">
      <h1>You're invited to {preview.name}</h1>
      {targetTeam && <p className="muted">You'll request to join the team "{targetTeam.name}".</p>}
      {error && <div className="error">{error}</div>}

      {user ? (
        <button onClick={handleJoin} disabled={joining}>
          {joining ? "Joining…" : targetTeam ? `Join ${preview.name} & request "${targetTeam.name}"` : `Join ${preview.name}`}
        </button>
      ) : (
        <div className="row">
          <button type="button" onClick={() => navigate(`/signup?redirect=${encodeURIComponent(here)}`)}>
            Sign up to join
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(here)}`)}
          >
            Log in
          </button>
        </div>
      )}
    </div>
  );
}
