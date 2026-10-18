import { Fragment, type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import type { Game, OddsSearchResult, Week } from "../types";
import { dayLabel, timeLabel } from "../utils/format";

export function CommissionerWeekPage() {
  const { leagueId, weekId } = useParams<{ leagueId: string; weekId: string }>();
  const [week, setWeek] = useState<Week | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadWeek() {
    apiFetch<Week>(`/weeks/${weekId}`).then(setWeek).catch((err) => setError(String(err)));
  }

  useEffect(loadWeek, [weekId]);

  if (!week) {
    return <div className="page">{error ? <div className="error">{error}</div> : "Loading…"}</div>;
  }

  const games = week.games ?? [];

  return (
    <div className="page">
      <p>
        <Link to={`/commissioner/${leagueId}`}>&larr; Back to weeks</Link>
      </p>
      <h1>{week.label}</h1>
      <p className="muted">
        Status: {week.status} ·{" "}
        <Link to={`/leagues/${leagueId}/weeks/${weekId}`}>view as a player</Link>
      </p>
      {error && <div className="error">{error}</div>}

      {week.status === "draft" ? (
        <CommissionerStaging weekId={week.id} games={games} onChange={loadWeek} />
      ) : (
        <>
          <h2>Games</h2>
          <CommissionerGamesTable weekId={week.id} games={games} onChange={loadWeek} />

          {week.status !== "graded" && (
            <CommissionerScoring weekId={week.id} games={games} onChange={loadWeek} />
          )}
        </>
      )}
    </div>
  );
}

function CommissionerGamesTable({
  weekId,
  games,
  onChange,
}: {
  weekId: string;
  games: Game[];
  onChange: () => void;
}) {
  const [correctingGameId, setCorrectingGameId] = useState<string | null>(null);

  return (
    <table>
      <thead>
        <tr>
          <th>Matchup</th>
          <th>Kickoff</th>
          <th>Line</th>
          <th>Score</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {games.map((g) => {
          const canCorrect = g.status !== "final" && g.status !== "void";
          const lastCorrection = g.corrections?.[0];
          return (
            <Fragment key={g.id}>
              <tr>
                <td>
                  {g.awayTeam} @ {g.homeTeam}
                </td>
                <td>
                  {dayLabel(g.kickoffAt)} {timeLabel(g.kickoffAt)}
                </td>
                <td>
                  {g.favoriteTeam === "home" ? g.homeTeam : g.awayTeam} -{g.spreadValue}
                  {lastCorrection && (
                    <div
                      className="muted"
                      title={`Corrected by ${lastCorrection.changedByUser.displayName}${lastCorrection.reason ? `: ${lastCorrection.reason}` : ""}`}
                    >
                      corrected{g.corrections!.length > 1 ? ` ×${g.corrections!.length}` : ""}
                    </div>
                  )}
                </td>
                <td>{g.homeScore !== null ? `${g.awayScore} - ${g.homeScore}` : "—"}</td>
                <td>{g.status}</td>
                <td>
                  {canCorrect && (
                    <button
                      className="secondary"
                      onClick={() => setCorrectingGameId((id) => (id === g.id ? null : g.id))}
                    >
                      {correctingGameId === g.id ? "Cancel" : "Correct line"}
                    </button>
                  )}
                </td>
              </tr>
              {correctingGameId === g.id && (
                <tr>
                  <td colSpan={6}>
                    <LineCorrectionForm
                      weekId={weekId}
                      game={g}
                      onDone={() => {
                        setCorrectingGameId(null);
                        onChange();
                      }}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function LineCorrectionForm({
  weekId,
  game,
  onDone,
}: {
  weekId: string;
  game: Game;
  onDone: () => void;
}) {
  const [favoriteTeam, setFavoriteTeam] = useState<"home" | "away">(game.favoriteTeam ?? "home");
  const [spreadValue, setSpreadValue] = useState(String(game.spreadValue ?? "3.5"));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/weeks/${weekId}/games/${game.id}/correct-line`, {
        method: "PATCH",
        body: JSON.stringify({ favoriteTeam, spreadValue: Number(spreadValue), reason: reason || undefined }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to correct the line");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="row" onSubmit={handleSubmit} style={{ flexWrap: "wrap", padding: "8px 0" }}>
      <select value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value as "home" | "away")}>
        <option value="home">{game.homeTeam}</option>
        <option value="away">{game.awayTeam}</option>
      </select>
      <input
        type="number"
        step="0.5"
        min="0"
        style={{ width: 80 }}
        value={spreadValue}
        onChange={(e) => setSpreadValue(e.target.value)}
        required
      />
      <input
        placeholder="Reason (optional)"
        style={{ flex: 1, minWidth: 160 }}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save correction"}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

function CommissionerStaging({
  weekId,
  games,
  onChange,
}: {
  weekId: string;
  games: Week["games"];
  onChange: () => void;
}) {
  const [sport, setSport] = useState<"americanfootball_nfl" | "americanfootball_ncaaf">(
    "americanfootball_nfl",
  );
  const [results, setResults] = useState<OddsSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [manualHome, setManualHome] = useState("");
  const [manualAway, setManualAway] = useState("");
  const [manualKickoff, setManualKickoff] = useState("");
  const [manualFavorite, setManualFavorite] = useState<"home" | "away">("home");
  const [manualSpread, setManualSpread] = useState("3.5");

  async function handleSearch() {
    setError(null);
    setBusy(true);
    try {
      setResults(await apiFetch<OddsSearchResult[]>(`/odds/search?sport=${sport}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(r: OddsSearchResult) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/weeks/${weekId}/games`, {
        method: "POST",
        body: JSON.stringify({
          games: [
            {
              source: "odds_api",
              externalId: r.externalId,
              sportKey: r.sportKey,
              homeTeam: r.homeTeam,
              awayTeam: r.awayTeam,
              kickoffAt: r.kickoffAt,
            },
          ],
        }),
      });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add game");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/weeks/${weekId}/games`, {
        method: "POST",
        body: JSON.stringify({
          games: [
            {
              source: "manual",
              sportKey: sport,
              homeTeam: manualHome,
              awayTeam: manualAway,
              kickoffAt: new Date(manualKickoff).toISOString(),
              favoriteTeam: manualFavorite,
              spreadValue: Number(manualSpread),
            },
          ],
        }),
      });
      setManualHome("");
      setManualAway("");
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add game");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(gameId: string) {
    setError(null);
    try {
      await apiFetch(`/weeks/${weekId}/games/${gameId}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove game");
    }
  }

  async function handlePublish() {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/weeks/${weekId}/publish`, { method: "POST" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <h2>Staged games</h2>
      {!games || games.length === 0 ? (
        <p className="muted">No games staged yet.</p>
      ) : (
        <ul className="list">
          {games.map((g) => (
            <li key={g.id} className="card row" style={{ justifyContent: "space-between" }}>
              <span>
                {g.awayTeam} @ {g.homeTeam} —{" "}
                {g.favoriteTeam === "home" ? g.homeTeam : g.awayTeam} -{g.spreadValue}
                <span className="muted">
                  {" "}
                  · {dayLabel(g.kickoffAt)} {timeLabel(g.kickoffAt)}
                </span>
              </span>
              <button className="danger" onClick={() => handleRemove(g.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={handlePublish} disabled={busy || !games || games.length === 0}>
        Publish week
      </button>

      <h2>Search live odds</h2>
      <div className="row">
        <select value={sport} onChange={(e) => setSport(e.target.value as typeof sport)}>
          <option value="americanfootball_nfl">NFL</option>
          <option value="americanfootball_ncaaf">NCAAF</option>
        </select>
        <button onClick={handleSearch} disabled={busy}>
          Search
        </button>
      </div>
      {results && (
        <ul className="list">
          {results.map((r) => (
            <li key={r.externalId} className="card row" style={{ justifyContent: "space-between" }}>
              <span>
                {r.awayTeam} @ {r.homeTeam}
                {r.favoriteTeam &&
                  ` — ${r.favoriteTeam === "home" ? r.homeTeam : r.awayTeam} -${r.spreadValue}`}
                <span className="muted">
                  {" "}
                  · {dayLabel(r.kickoffAt)} {timeLabel(r.kickoffAt)}
                </span>
              </span>
              <button onClick={() => handleAdd(r)} disabled={busy}>
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Add a game manually</h2>
      <form className="form" onSubmit={handleManualAdd}>
        <div>
          <label>Home team</label>
          <input value={manualHome} onChange={(e) => setManualHome(e.target.value)} required />
        </div>
        <div>
          <label>Away team</label>
          <input value={manualAway} onChange={(e) => setManualAway(e.target.value)} required />
        </div>
        <div>
          <label>Kickoff</label>
          <input
            type="datetime-local"
            value={manualKickoff}
            onChange={(e) => setManualKickoff(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Favorite</label>
          <select value={manualFavorite} onChange={(e) => setManualFavorite(e.target.value as "home" | "away")}>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </div>
        <div>
          <label>Spread</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={manualSpread}
            onChange={(e) => setManualSpread(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={busy}>
          Add game
        </button>
      </form>
    </div>
  );
}

function CommissionerScoring({
  weekId,
  games,
  onChange,
}: {
  weekId: string;
  games: Week["games"];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRefresh() {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/weeks/${weekId}/refresh-scores`, { method: "POST" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to refresh scores");
    } finally {
      setBusy(false);
    }
  }

  async function handleVoid(gameId: string) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/weeks/${weekId}/games/${gameId}/void`, { method: "PATCH" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to void game");
    } finally {
      setBusy(false);
    }
  }

  const pending = (games ?? []).filter((g) => g.status !== "final" && g.status !== "void");
  if (pending.length === 0) return null;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Pending games</h2>
      <p className="muted">
        Scores and final results come from ESPN automatically — there's nothing to enter. If a game
        is postponed or canceled, void it so it's excluded from scoring.
      </p>
      {error && <div className="error">{error}</div>}
      <button className="secondary" onClick={handleRefresh} disabled={busy}>
        Refresh scores now
      </button>
      <ul className="list">
        {pending.map((g) => (
          <li key={g.id} className="row" style={{ margin: "8px 0" }}>
            <span style={{ minWidth: 220 }}>
              {g.awayTeam} @ {g.homeTeam}
              {g.status === "in_progress" && ` — ${g.awayScore}-${g.homeScore}`}
            </span>
            <button className="danger" onClick={() => handleVoid(g.id)} disabled={busy}>
              Void
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
