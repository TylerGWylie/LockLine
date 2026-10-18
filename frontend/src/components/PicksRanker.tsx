import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import type { Game, Pick } from "../types";

interface PicksRankerProps {
  weekId: string;
  teamId: string;
  games: Game[];
  locked: boolean;
}

function buildInitialOrder(games: Game[], picks: Pick[]): string[] {
  const picked = new Map(picks.map((p) => [p.gameId, p]));
  return [...games]
    .sort((a, b) => {
      const pa = picked.get(a.id);
      const pb = picked.get(b.id);
      if (pa && pb) return pb.confidenceValue - pa.confidenceValue;
      if (pa && !pb) return -1;
      if (!pa && pb) return 1;
      return a.orderIndex - b.orderIndex;
    })
    .map((g) => g.id);
}

export function PicksRanker({ weekId, teamId, games, locked }: PicksRankerProps) {
  const [order, setOrder] = useState<string[]>(games.map((g) => g.id));
  const [sideByGame, setSideByGame] = useState<Record<string, "home" | "away">>({});
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const gamesById = new Map(games.map((g) => [g.id, g]));
  const n = games.length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    apiFetch<{ picks: Pick[]; version: string | null }>(`/weeks/${weekId}/teams/${teamId}/picks`)
      .then(({ picks, version }) => {
        setOrder(buildInitialOrder(games, picks));
        const sides: Record<string, "home" | "away"> = {};
        for (const p of picks) sides[p.gameId] = p.sideSelected;
        setSideByGame(sides);
        setVersion(version);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load picks"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, teamId]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      return arrayMove(current, from, to);
    });
  }

  function confidenceFor(gameId: string): number {
    return n - order.indexOf(gameId);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const picks = order
        .filter((gameId) => sideByGame[gameId])
        .map((gameId) => ({
          gameId,
          confidenceValue: confidenceFor(gameId),
          sideSelected: sideByGame[gameId],
        }));
      const result = await apiFetch<{ picks: Pick[]; version: string | null }>(
        `/weeks/${weekId}/teams/${teamId}/picks`,
        { method: "PUT", body: JSON.stringify({ version, picks }) },
      );
      setVersion(result.version);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save picks");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading picks…</p>;

  const missingSideCount = order.filter((id) => !sideByGame[id]).length;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <p className="muted">
        Drag to rank most confident (top, {n} pts) to least confident (bottom, 1 pt). Pick a side for
        every game before saving.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="list">
            {order.map((gameId) => {
              const game = gamesById.get(gameId);
              if (!game) return null;
              return (
                <SortableRow
                  key={gameId}
                  id={gameId}
                  confidence={confidenceFor(gameId)}
                  game={game}
                  side={sideByGame[gameId]}
                  disabled={locked}
                  onPickSide={(side) =>
                    setSideByGame((current) => ({ ...current, [gameId]: side }))
                  }
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {!locked && (
        <>
          {missingSideCount > 0 && (
            <p className="muted">{missingSideCount} game(s) still need a side picked.</p>
          )}
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save picks"}
          </button>
          {savedAt && <span className="muted"> Saved {savedAt.toLocaleTimeString()}</span>}
        </>
      )}
      {locked && <p className="muted">Picks are locked for this week.</p>}
    </div>
  );
}

interface SortableRowProps {
  id: string;
  confidence: number;
  game: Game;
  side: "home" | "away" | undefined;
  disabled: boolean;
  onPickSide: (side: "home" | "away") => void;
}

function SortableRow({ id, confidence, game, side, disabled, onPickSide }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className="ranker-item">
      <span
        className="drag-handle"
        aria-label="Drag to reorder"
        {...(disabled ? {} : attributes)}
        {...(disabled ? {} : listeners)}
      >
        ⠿
      </span>
      <span className="confidence">{confidence}</span>
      <div style={{ flex: 1 }}>
        <div className="row">
          <button
            type="button"
            className={side === "home" ? "" : "secondary"}
            disabled={disabled}
            onClick={() => onPickSide("home")}
          >
            {game.homeTeam}
          </button>
          <button
            type="button"
            className={side === "away" ? "" : "secondary"}
            disabled={disabled}
            onClick={() => onPickSide("away")}
          >
            {game.awayTeam}
          </button>
        </div>
        <div className="muted">
          {game.favoriteTeam === "home" ? game.homeTeam : game.awayTeam} favored by {game.spreadValue}
          {game.status !== "scheduled" && ` · ${game.status}`}
        </div>
      </div>
    </li>
  );
}
