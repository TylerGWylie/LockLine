export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface League {
  id: string;
  name: string;
  inviteCode: string;
  role?: "commissioner" | "member";
}

export interface LeagueDetail extends League {
  seasons: Season[];
}

export interface Season {
  id: string;
  leagueId: string;
  label: string;
  status: "upcoming" | "active" | "complete";
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  memberships?: { userId: string; user: { id: string; displayName: string } }[];
}

export interface Week {
  id: string;
  seasonId: string;
  weekNumber: number;
  label: string;
  status: "draft" | "published" | "locked" | "graded";
  lockAt: string | null;
  publishedAt: string | null;
  games?: Game[];
  season?: Season;
}

export interface Game {
  id: string;
  weekId: string;
  externalId: string | null;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  homeConference: string | null;
  awayConference: string | null;
  kickoffAt: string;
  status: "scheduled" | "in_progress" | "final" | "void";
  homeScore: number | null;
  awayScore: number | null;
  orderIndex: number;
  favoriteTeam: "home" | "away" | null;
  spreadValue: number | null;
}

export interface OddsSearchResult {
  externalId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  favoriteTeam: "home" | "away" | null;
  spreadValue: number | null;
  spreadBookmakerKey: string | null;
}

export interface Pick {
  id: string;
  teamId: string;
  gameId: string;
  weekId: string;
  confidenceValue: number;
  sideSelected: "home" | "away";
  result: "pending" | "covered" | "not_covered" | "push" | "void";
  pointsAwarded: number | null;
}

export interface WeekStandingRow {
  teamId: string;
  teamName: string;
  points: number;
  pointsPossible: number;
}

export interface SeasonStandingRow {
  teamId: string;
  teamName: string;
  points: number;
}
