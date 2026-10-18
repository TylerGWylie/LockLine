export interface WhatIfGame {
  id: string;
  favoriteTeam: "home" | "away" | null;
  spreadValue: number | null;
  status: string;
}

export interface WhatIfPick {
  gameId: string;
  confidenceValue: number;
  sideSelected: "home" | "away";
  result: string;
  pointsAwarded: number | null;
}

export interface WhatIfTeam {
  teamId: string;
  teamName: string;
  picks: WhatIfPick[];
  seasonPointsBeforeThisWeek: number;
}

export interface WhatIfData {
  weekId: string;
  games: WhatIfGame[];
  teams: WhatIfTeam[];
}

/** gameId -> the side hypothetically chosen to cover. Omit a gameId to leave it unresolved. */
export type HypotheticalOutcomes = Record<string, "home" | "away">;

export interface WeekStandingRow {
  teamId: string;
  teamName: string;
  points: number;
  pointsPossible: number;
  complete: boolean;
}

export interface SeasonStandingRow {
  teamId: string;
  teamName: string;
  points: number;
}

function pickPoints(
  pick: WhatIfPick,
  game: WhatIfGame | undefined,
  hypotheses: HypotheticalOutcomes,
): { points: number; resolved: boolean } {
  if (!game || game.status === "void") {
    return { points: 0, resolved: true };
  }
  if (game.status === "final") {
    return { points: pick.pointsAwarded ?? 0, resolved: true };
  }

  const hypotheticalSide = hypotheses[pick.gameId];
  if (!hypotheticalSide) {
    return { points: 0, resolved: false };
  }
  return { points: pick.sideSelected === hypotheticalSide ? pick.confidenceValue : 0, resolved: true };
}

export function computeWeekStandings(
  data: WhatIfData,
  hypotheses: HypotheticalOutcomes,
): WeekStandingRow[] {
  const gamesById = new Map(data.games.map((g) => [g.id, g]));

  return data.teams
    .map((team) => {
      let points = 0;
      let pointsPossible = 0;
      let complete = true;
      for (const pick of team.picks) {
        const game = gamesById.get(pick.gameId);
        const { points: p, resolved } = pickPoints(pick, game, hypotheses);
        points += p;
        if (!game || game.status !== "void") pointsPossible += pick.confidenceValue;
        if (!resolved) complete = false;
      }
      return { teamId: team.teamId, teamName: team.teamName, points, pointsPossible, complete };
    })
    .sort((a, b) => b.points - a.points);
}

export function computeSeasonStandings(
  data: WhatIfData,
  hypotheses: HypotheticalOutcomes,
): SeasonStandingRow[] {
  const weekStandings = computeWeekStandings(data, hypotheses);
  const weekPointsByTeam = new Map(weekStandings.map((r) => [r.teamId, r.points]));

  return data.teams
    .map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      points: team.seasonPointsBeforeThisWeek + (weekPointsByTeam.get(team.teamId) ?? 0),
    }))
    .sort((a, b) => b.points - a.points);
}
