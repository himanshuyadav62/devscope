export function nextDailyRunAt(timeOfDay: string, from = new Date()) {
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(timeOfDay);
  if (!match) throw new Error("Use a valid 24-hour time like 09:00.");

  const next = new Date(from);
  next.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export function normalizeScheduleTime(value: unknown) {
  const time = typeof value === "string" ? value.trim() : "";
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    throw new Error("Use a valid schedule time in 24-hour format.");
  }
  return time;
}

export function normalizeTimezone(value: unknown) {
  const timezone = typeof value === "string" && value.trim() ? value.trim() : "UTC";
  return timezone.slice(0, 80);
}
