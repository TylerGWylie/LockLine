// House rule: spreads are always a half-point so a push can never happen. If the
// market (or a manual entry) lands on a whole number, nudge it up by half a point
// in the underdog's favor rather than storing a push-able line.
export function ensureHalfPointSpread(value: number): number {
  return Number.isInteger(value) ? value + 0.5 : value;
}
