import { env } from "../env";

const BASE_URL = "https://api.the-odds-api.com/v4";

export interface OddsEvent {
  externalId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  favoriteTeam: "home" | "away" | null;
  spreadValue: number | null;
  spreadBookmakerKey: string | null;
}

interface RawOutcome {
  name: string;
  point: number;
}

interface RawMarket {
  key: string;
  outcomes: RawOutcome[];
}

interface RawBookmaker {
  key: string;
  markets: RawMarket[];
}

interface RawEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: RawBookmaker[];
}

function normalizeEvent(event: RawEvent): OddsEvent {
  const preferred =
    event.bookmakers.find((b) => b.key === env.oddsApiBookmaker) ?? event.bookmakers[0];
  const spreadsMarket = preferred?.markets.find((m) => m.key === "spreads");

  let favoriteTeam: "home" | "away" | null = null;
  let spreadValue: number | null = null;

  if (spreadsMarket && spreadsMarket.outcomes.length > 0) {
    const favoriteOutcome =
      spreadsMarket.outcomes.find((o) => o.point < 0) ?? spreadsMarket.outcomes[0];
    favoriteTeam = favoriteOutcome.name === event.home_team ? "home" : "away";
    spreadValue = Math.abs(favoriteOutcome.point);
  }

  return {
    externalId: event.id,
    sportKey: event.sport_key,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    kickoffAt: event.commence_time,
    favoriteTeam,
    spreadValue,
    spreadBookmakerKey: preferred?.key ?? null,
  };
}

async function fetchEvents(sportKey: string): Promise<OddsEvent[]> {
  const url = `${BASE_URL}/sports/${sportKey}/odds?apiKey=${env.oddsApiKey}&regions=us&markets=spreads`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Odds API error ${res.status}: ${await res.text()}`);
  }
  const events = (await res.json()) as RawEvent[];
  return events.map(normalizeEvent);
}

export function searchEvents(sportKey: string): Promise<OddsEvent[]> {
  return fetchEvents(sportKey);
}

export async function getFreshSpreadsByExternalId(
  sportKey: string,
  externalIds: string[],
): Promise<Map<string, OddsEvent>> {
  const events = await fetchEvents(sportKey);
  const byId = new Map(events.map((e) => [e.externalId, e]));
  const result = new Map<string, OddsEvent>();
  for (const id of externalIds) {
    const event = byId.get(id);
    if (event) result.set(id, event);
  }
  return result;
}

