export interface EspnScore {
  homeTeam: string;
  awayTeam: string;
  completed: boolean;
  inProgress: boolean;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: string;
}

// Maps our sportKey convention (shared with The Odds API) to ESPN's URL path.
const SPORT_PATHS: Record<string, string> = {
  americanfootball_nfl: "football/nfl",
  americanfootball_ncaaf: "football/college-football",
};

interface RawCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team: { displayName: string };
}

interface RawEvent {
  date: string;
  competitions: {
    status: { type: { completed: boolean; state: string } };
    competitors: RawCompetitor[];
  }[];
}

interface RawScoreboard {
  events: RawEvent[];
}

async function fetchScoreboard(sportKey: string): Promise<EspnScore[]> {
  const path = SPORT_PATHS[sportKey];
  if (!path) return [];

  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?limit=200`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as RawScoreboard;

  const scores: EspnScore[] = [];
  for (const event of data.events) {
    const competition = event.competitions[0];
    if (!competition) continue;
    const home = competition.competitors.find((c) => c.homeAway === "home");
    const away = competition.competitors.find((c) => c.homeAway === "away");
    if (!home || !away) continue;

    scores.push({
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
      completed: competition.status.type.completed,
      inProgress: competition.status.type.state === "in",
      homeScore: home.score !== undefined ? Number(home.score) : null,
      awayScore: away.score !== undefined ? Number(away.score) : null,
      kickoffAt: event.date,
    });
  }
  return scores;
}

export function getEspnScoresBySport(sportKey: string): Promise<EspnScore[]> {
  return fetchScoreboard(sportKey);
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findMatchingScore(
  scores: EspnScore[],
  homeTeam: string,
  awayTeam: string,
): EspnScore | undefined {
  const home = normalizeTeamName(homeTeam);
  const away = normalizeTeamName(awayTeam);
  return scores.find(
    (s) => normalizeTeamName(s.homeTeam) === home && normalizeTeamName(s.awayTeam) === away,
  );
}
