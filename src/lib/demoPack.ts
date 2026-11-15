import pack from "./demo-pack.json";
import { seedCache } from "./cache";
import type { PowerSeries } from "./api/power";

type DemoPack = {
  version: 1;
  endYear: number;
  places: Record<
    string,
    {
      lat: number;
      lon: number;
      power: PowerSeries;
    }
  >;
};

const POWER_VARIABLES = "T2M,PRECTOTCORR";

/**
 * Put the checked-in demo data behind the same cache keys as the live client.
 * The rest of the app does not need a separate offline code path.
 */
export function seedDemoPack(): void {
  const demo = pack as DemoPack;

  for (const item of Object.values(demo.places)) {
    for (const startYear of [demo.endYear - 9, demo.endYear - 39]) {
      const endYear = demo.endYear;
      const power: PowerSeries = {
        ...item.power,
        series: Object.fromEntries(
          Object.entries(item.power.series).map(([variable, points]) => [
            variable,
            points.filter((point) => point.year >= startYear && point.year <= endYear),
          ]),
        ),
      };
      seedCache(
        `power:${item.lat.toFixed(2)}:${item.lon.toFixed(2)}:${startYear}:${endYear}:${POWER_VARIABLES}`,
        power,
      );
    }
  }
}
