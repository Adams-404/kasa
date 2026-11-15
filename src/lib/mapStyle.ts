import type { StyleSpecification } from "maplibre-gl";
import {
  BASEMAP,
  COASTLINES,
  IMAGERY,
  datedTiles,
  imageryLayerFor,
  staticTiles,
} from "./gibs";

/**
 * One style, used by both the main map and the comparison map in swipe mode.
 * They must match exactly or the divider would show a seam that is not there.
 */
export function buildMapStyle(date: string): StyleSpecification {
  const imagery = imageryLayerFor(date) ?? IMAGERY.modisTerra;

  return {
    version: 8,
    name: "Kasa strata",
    projection: {
      type: ["interpolate", ["linear"], ["zoom"], 2.4, "globe", 5.6, "mercator"],
    },
    sources: {
      basemap: {
        type: "raster",
        tiles: staticTiles(BASEMAP),
        tileSize: 256,
        maxzoom: BASEMAP.maxZoom,
      },
      imagery: {
        type: "raster",
        tiles: datedTiles(imagery, date),
        tileSize: 256,
        maxzoom: imagery.maxZoom,
      },
      coastlines: {
        type: "raster",
        tiles: staticTiles(COASTLINES),
        tileSize: 256,
        maxzoom: COASTLINES.maxZoom,
      },
    },
    sky: {
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
    },
    layers: [
      { id: "basemap", type: "raster", source: "basemap" },
      {
        id: "imagery",
        type: "raster",
        source: "imagery",
        minzoom: 3.2,
        paint: { "raster-fade-duration": 180 },
      },
      {
        id: "coastlines",
        type: "raster",
        source: "coastlines",
        minzoom: 3.5,
        paint: { "raster-opacity": 0.32 },
      },
    ],
  };
}
