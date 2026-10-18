export function signedSpread(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export function dayLabel(kickoffAt: string): string {
  return new Date(kickoffAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function timeLabel(kickoffAt: string): string {
  return new Date(kickoffAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
