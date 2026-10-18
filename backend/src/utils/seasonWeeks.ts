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

  const weeks: GeneratedWeek[] = [];
  let cursor = firstWeekStart;
  let weekNumber = 1;
  while (cursor <= lastWeekStart) {
    const startDate = new Date(cursor);
    const endDate = new Date(cursor);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    weeks.push({ weekNumber, label: `Week ${weekNumber}`, startDate, endDate });
    cursor = endDate;
    weekNumber++;
  }
  return weeks;
}
