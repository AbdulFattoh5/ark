import type { TimeSlot } from "../types/booking";

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function isoToMinutesInTz(iso: string, timezone: string): number {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  return (hour === 24 ? 0 : hour) * 60 + minute;
}

export function isoToDateInTz(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function getCurrentMinutesInTz(timezone: string): number {
  return isoToMinutesInTz(new Date().toISOString(), timezone);
}

export function generateTimeSlots(
  openingMinutes: number,
  closingMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let m = openingMinutes; m <= closingMinutes; m += 30) {
    slots.push({
      minutes: m,
      label: minutesToTime(m),
      isHour: m % 60 === 0,
    });
  }
  return slots;
}

export function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(y, mo - 1, d));
}
