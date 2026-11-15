import type { StyleSpecification } from "maplibre-gl";
import {
  BASEMAP,
  COASTLINES,
  IMAGERY,
  OSM_DETAIL,
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
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
    },
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
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
      {
        id: "osm-road-casing",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 7,
        paint: {
          "line-color": "#f8f1dc",
          "line-opacity": 0.82,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 12, 3.2, 16, 7],
        },
      },
      {
        id: "osm-road",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 7,
        paint: {
          "line-color": "#7d5f3d",
          "line-opacity": 0.78,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.35, 12, 1.4, 16, 3.2],
        },
      },
      {
        id: "osm-buildings",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        maxzoom: OSM_DETAIL.maxZoom,
        paint: {
          "fill-color": "#eadcc6",
          "fill-opacity": 0.7,
        },
      },
      {
        id: "osm-place-labels",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 7,
        layout: {
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 11, 12, 16],
          "text-max-width": 9,
        },
        paint: {
          "text-color": "#fff9e8",
          "text-halo-color": "#3e3428",
          "text-halo-width": 1.5,
          "text-halo-blur": 0.3,
        },
      },
      {
        id: "osm-road-labels",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "transportation_name",
        minzoom: 10,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 16, 14],
          "text-max-angle": 45,
          "text-padding": 2,
        },
        paint: {
          "text-color": "#fff9e8",
          "text-halo-color": "#3e3428",
          "text-halo-width": 1.25,
          "text-halo-blur": 0.3,
        },
      },
    ],
  };
}
