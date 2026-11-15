/**
 * Time helpers.
 *
 * The core compares whole years on the same calendar day, and the imagery we
 * show is a MODIS 8-day composite whose periods start on a fixed grid
 * (2000-02-26 + 8 days). Snapping to that grid removes the two problems daily
 * true colour gives us: missing days, and cloud.
 */

/** Sample day, month-day. Early November: dry and usually clear over West Africa. */
export const SAMPLE_DAY = "11-05";

const COMPOSITE_BASE_MS = Date.UTC(2000, 1, 26);
const DAY_MS = 86_400_000;
export const COMPOSITE_DAYS = 8;

/** Snap any date down to the start of its 8-day composite period. */
export function compositeStart(iso: string): string {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  const days = Math.floor((ms - COMPOSITE_BASE_MS) / DAY_MS);
  const snapped = COMPOSITE_BASE_MS + Math.floor(days / COMPOSITE_DAYS) * COMPOSITE_DAYS * DAY_MS;
  return new Date(snapped).toISOString().slice(0, 10);
}

/** The imagery date for a year: same season every year, on the composite grid. */
export function sampleDate(year: number): string {
  return compositeStart(`${year}-${SAMPLE_DAY}`);
}

/** The last day covered by a composite period. */
export function compositeEnd(start: string): string {
  const ms = Date.parse(`${start}T00:00:00Z`) + (COMPOSITE_DAYS - 1) * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

/** The last full year we can have imagery for. */
export function lastCompleteYear(): number {
  return new Date().getUTCFullYear() - 1;
}

export function yearWindow(years: number, endYear: number = lastCompleteYear()): Array<number> {
  const start = endYear - years + 1;
  const list: Array<number> = [];
  for (let y = start; y <= endYear; y++) list.push(y);
  return list;
}
