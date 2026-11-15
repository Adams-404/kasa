/**
 * NASA GIBS tile access.
 *
 * Every value here was read from the live GetCapabilities document on 2026-11-15:
 * https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
 * Do not add a layer ID that is not in that document.
 */

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export type GibsLayer = {
  id: string;
  tileMatrixSet: string;
  ext: "jpeg" | "png";
  /** Highest native zoom. The raster source must be told, or tiles 404 above it. */
  maxZoom: number;
  /** First date with data, ISO. */
  from: string;
  label: string;
};

export const BASEMAP = {
  id: "BlueMarble_NextGeneration",
  tileMatrixSet: "GoogleMapsCompatible_Level8",
  ext: "jpeg",
  maxZoom: 8,
} as const;

export const COASTLINES = {
  id: "Coastlines_15m",
  tileMatrixSet: "GoogleMapsCompatible_Level13",
  ext: "png",
  maxZoom: 13,
} as const;

/**
 * Imagery layers, best first.
 *
 * The core uses the MODIS Terra 8-day surface reflectance composite: every year
 * is covered, the composite screens out cloud, and it is available from 2000.
 * True colour daily layers are kept for a "latest clear day" view later.
 */
export const IMAGERY: Record<string, GibsLayer> = {
  terraComposite: {
    id: "MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day",
    tileMatrixSet: "GoogleMapsCompatible_Level8",
    ext: "jpeg",
    maxZoom: 8,
    from: "2000-02-26",
    label: "MODIS Terra, 8-day composite",
  },
  modisTerra: {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    ext: "jpeg",
    maxZoom: 9,
    from: "2000-02-24",
    label: "MODIS Terra, true colour",
  },
  viirsNoaa20: {
    id: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    ext: "jpeg",
    maxZoom: 9,
    from: "2018-01-05",
    label: "VIIRS NOAA-20, true colour",
  },
  viirsSnpp: {
    id: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    ext: "jpeg",
    maxZoom: 9,
    from: "2015-11-24",
    label: "VIIRS Suomi NPP, true colour",
  },
};

/** Daily imagery lags real time by a day or two; ask for a date safely behind it. */
export const IMAGERY_LAG_DAYS = 2;

/** Static layer: no date, the capabilities template repeats `default` for time. */
export function staticTiles(layer: {
  id: string;
  tileMatrixSet: string;
  ext: string;
}): Array<string> {
  return [
    `${GIBS}/${layer.id}/default/default/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.ext}`,
  ];
}

/** Date layer: the date is baked into the template, as MapLibre has no time dimension. */
export function datedTiles(layer: GibsLayer, isoDate: string): Array<string> {
  return [
    `${GIBS}/${layer.id}/default/${isoDate}/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.ext}`,
  ];
}

/**
 * Which imagery layer serves this date. The 8-day composite is complete from
 * 2000-02-26, so it is the default; daily records are the fallback.
 */
export function imageryLayerFor(isoDate: string): GibsLayer | null {
  if (isoDate >= IMAGERY.terraComposite.from) return IMAGERY.terraComposite;
  if (isoDate >= IMAGERY.viirsNoaa20.from) return IMAGERY.viirsNoaa20;
  if (isoDate >= IMAGERY.viirsSnpp.from) return IMAGERY.viirsSnpp;
  if (isoDate >= IMAGERY.modisTerra.from) return IMAGERY.modisTerra;
  return null;
}
