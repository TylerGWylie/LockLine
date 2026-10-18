// Generates the full slate of Thursday-through-Wednesday weeks for a season,
// from the first college football week through the week of the Super Bowl.
//
// There's no sports-calendar API wired in for these exact dates, so this uses a
// reasonable heuristic: college football's regular season always opens by the
// last week of August, and since 2022 the Super Bowl has consistently fallen on
// the second Sunday of February. The commissioner can remove any still-draft
// week this approximation gets wrong (e.g. an extra week at either end).

function firstThursdayOnOrAfter(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun .. 4=Thu .. 6=Sat
  const daysUntilThursday = (4 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntilThursday);
  return d;
}

function secondSundayOfFebruary(year: number): Date {
  const firstOfFeb = new Date(Date.UTC(year, 1, 1));
  const daysToFirstSunday = (7 - firstOfFeb.getUTCDay()) % 7;
  return new Date(Date.UTC(year, 1, 1 + daysToFirstSunday + 7));
}

function formatMonthDay(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

// endDate is exclusive (the next week's start), so the window's real last day is endDate - 1.
function formatDateRange(startDate: Date, endDate: Date): string {
  const lastDay = new Date(endDate);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  return `${formatMonthDay(startDate)}-${formatMonthDay(lastDay)}`;
}

// College's regular season + conference championships run ~17 weeks from kickoff; after that
// it's bowl season, which doesn't map onto a single "week N" the way the regular season does.
// NFL week 1 starts one week after college week 1 and runs 18 regular-season weeks. The last
// 4 generated weeks are anchored to the Super Bowl (the one date this is built around) and
// counted backwards for the playoff rounds, rather than forward from week 1, since the gap
// between the regular season and the playoffs varies by a week or two depending on how the
// Aug-20/Super-Bowl anchors land in a given year. Any week that falls in that gap — past the
// college/NFL regular seasons but short of the playoffs — just shows its date range. Both are
// heuristics the commissioner can correct by removing any auto-generated week that doesn't
// apply to their league.
const COLLEGE_REGULAR_SEASON_WEEKS = 17;
const NFL_REGULAR_SEASON_WEEKS = 18;
const NFL_PLAYOFF_ROUND_NAMES = ["Wild Card Round", "Divisional Round", "Conference Championships", "Super Bowl"];

function buildLabel(weekNumber: number, totalWeeks: number, startDate: Date, endDate: Date): string {
  const weeksFromEnd = totalWeeks - weekNumber;
  const parts: string[] = [];

  if (weeksFromEnd < NFL_PLAYOFF_ROUND_NAMES.length) {
    parts.push(NFL_PLAYOFF_ROUND_NAMES[NFL_PLAYOFF_ROUND_NAMES.length - 1 - weeksFromEnd]);
  } else {
    const collegeWeekNumber = weekNumber;
    const nflWeekNumber = weekNumber - 1;
    if (collegeWeekNumber <= COLLEGE_REGULAR_SEASON_WEEKS) {
      parts.push(`College Week ${collegeWeekNumber}`);
    }
    if (nflWeekNumber >= 1 && nflWeekNumber <= NFL_REGULAR_SEASON_WEEKS) {
      parts.push(`NFL Week ${nflWeekNumber}`);
    }
  }
  if (parts.length === 0) {
    // Past both regular seasons but short of the NFL playoffs — this is college bowl season.
    parts.push("Bowl Season");
  }

  return `${parts.join(" | ")} (${formatDateRange(startDate, endDate)})`;
}

export interface GeneratedWeek {
  weekNumber: number;
  label: string;
  startDate: Date;
  endDate: Date;
}

export function generateSeasonWeeks(seasonStartYear: number): GeneratedWeek[] {
  const firstWeekStart = firstThursdayOnOrAfter(new Date(Date.UTC(seasonStartYear, 7, 20))); // Aug 20
  const superBowlSunday = secondSundayOfFebruary(seasonStartYear + 1);
  const lastWeekStart = new Date(superBowlSunday);
  lastWeekStart.setUTCDate(superBowlSunday.getUTCDate() - 3); // the Thursday that starts Super Bowl week

  const windows: { weekNumber: number; startDate: Date; endDate: Date }[] = [];
  let cursor = firstWeekStart;
  let weekNumber = 1;
  while (cursor <= lastWeekStart) {
    const startDate = new Date(cursor);
    const endDate = new Date(cursor);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    windows.push({ weekNumber, startDate, endDate });
    cursor = endDate;
    weekNumber++;
  }

  const totalWeeks = windows.length;
  return windows.map((w) => ({
    weekNumber: w.weekNumber,
    label: buildLabel(w.weekNumber, totalWeeks, w.startDate, w.endDate),
    startDate: w.startDate,
    endDate: w.endDate,
  }));
}
