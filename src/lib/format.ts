export type Place = {
  lat: number;
  lon: number;
  /** Shown in the header. Falls back to coordinates until geocoding lands. */
  name: string;
  /** Optional second line, e.g. "Gombe State, Nigeria". */
  detail?: string;
};

const COMPASS = ["N", "E", "S", "W"];

/** 10.29, 11.17 -> "10.29° N, 11.17° E" */
export function formatLatLon(lat: number, lon: number): string {
  const latHemisphere = lat >= 0 ? COMPASS[0] : COMPASS[2];
  const lonHemisphere = lon >= 0 ? COMPASS[1] : COMPASS[3];
  return `${Math.abs(lat).toFixed(2)}° ${latHemisphere}, ${Math.abs(lon).toFixed(2)}° ${lonHemisphere}`;
}

export function clampLat(lat: number): number {
  return Math.max(-85, Math.min(85, lat));
}

export function placeFromCoords(lat: number, lon: number): Place {
  return {
    lat: clampLat(lat),
    lon,
    name: formatLatLon(lat, lon),
  };
}
