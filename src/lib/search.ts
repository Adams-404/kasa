import { clampLat } from "./format";

const COORDINATES =
  /^\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([NS])?\s*(?:,|\s)\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i;

/**
 * "10.29, 11.17", "10.29 11.17", "10.29N, 11.17E" -> numbers.
 * Anything else is a name, and goes to geocoding instead.
 */
export function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const match = COORDINATES.exec(input);
  if (!match) return null;

  let lat = Number(match[1]);
  let lon = Number(match[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const latDirection = match[2]?.toUpperCase();
  const lonDirection = match[4]?.toUpperCase();
  if (latDirection === "S") lat = -Math.abs(lat);
  if (latDirection === "N") lat = Math.abs(lat);
  if (lonDirection === "W") lon = -Math.abs(lon);
  if (lonDirection === "E") lon = Math.abs(lon);

  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  return { lat: clampLat(lat), lon };
}
