import type { Place } from "../lib/format";

export type DemoPlace = {
  label: string;
  place: Place;
};

/** Three demo places. Prefetched packs land here in Phase 9. */
export const DEMO_PLACES: Array<DemoPlace> = [
  {
    label: "Gombe, Nigeria",
    place: { lat: 10.29, lon: 11.17, name: "Gombe, Nigeria" },
  },
  {
    label: "Lake Chad",
    place: { lat: 13.0, lon: 14.2, name: "Lake Chad" },
  },
  {
    label: "Atacama Desert",
    place: { lat: -23.86, lon: -69.13, name: "Atacama Desert, Chile" },
  },
];
