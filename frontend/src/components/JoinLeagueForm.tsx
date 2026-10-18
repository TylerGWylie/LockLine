import { type FormEvent, useState } from "react";
import { apiFetch, ApiError } from "../api/client";

export function JoinLeagueForm({ onJoined }: { onJoined: () => void }) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/leagues/join", { method: "POST", body: JSON.stringify({ inviteCode }) });
      setInviteCode("");
      onJoined();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Join a league</h2>
      <form className="form" onSubmit={handleJoin}>
        <div>
          <label>Invite code</label>
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} required />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={submitting}>
          Join league
        </button>
      </form>
    </div>
  );
}
