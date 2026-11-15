import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type RasterTileSource,
} from "maplibre-gl";
// Vite cannot resolve MapLibre's internal `new URL(..., import.meta.url)` worker
// once the package is pre-bundled, so hand it a bundled worker URL instead.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { IMAGERY, datedTiles, imageryLayerFor } from "../lib/gibs";
import { buildMapStyle } from "../lib/mapStyle";
import { buildMarkerElement } from "../lib/marker";
import type { Place } from "../lib/format";

type EarthMapProps = {
  place: Place | null;
  /** ISO date driving the satellite imagery. */
  date: string;
  onPick: (place: Place) => void;
  /** Hands the map instance to App so the comparison map can follow it. */
  onReady?: (map: MapLibreMap | null) => void;
};

const HOME_CENTER: [number, number] = [11.17, 8];
const HOME_ZOOM = 2.05;
const PLACE_ZOOM = 8.8;

setWorkerUrl(maplibreWorkerUrl);

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One map for the whole app. The globe and the place view are the same map at
 * different zooms, which is what lets the dive be a single camera move: the
 * projection interpolates from globe to flat as the zoom passes through.
 */
export default function EarthMap({ place, date, onPick, onReady }: EarthMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const spinRef = useRef({ enabled: !prefersReducedMotion(), last: 0 });
  const lastPlaceRef = useRef<Place | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;

    const style = buildMapStyle(date);

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style,
        center: HOME_CENTER,
        zoom: HOME_ZOOM,
        minZoom: 0.4,
        maxZoom: 16,
        renderWorldCopies: false,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setFailed(true);
      return;
    }

    mapRef.current = map;
    onReadyRef.current?.(map);

    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>',
      }),
      "bottom-right",
    );

    map.on("load", () => setLoaded(true));

    map.on("click", (event) => {
      if (place) return;
      const { lat, lng } = event.lngLat;
      const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
      onPickRef.current({ lat, lon: wrapped, name: "" });
    });

    const stopSpin = () => {
      spinRef.current.enabled = false;
    };
    map.on("dragstart", stopSpin);
    map.on("zoomstart", stopSpin);
    map.on("wheel", stopSpin);

    let raf = 0;
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      const spin = spinRef.current;
      const previous = spin.last;
      spin.last = time;
      if (!spin.enabled || previous === 0) return;
      if (map.isMoving() || map.isZooming()) return;
      // ~1.6 degrees per second: a full turn in under four minutes.
      const delta = Math.min(time - previous, 100) / 1000;
      const center = map.getCenter();
      map.jumpTo({ center: [center.lng + delta * 1.6, center.lat] });
    };
    raf = requestAnimationFrame(tick);

    const marker = new Marker({
      element: buildMarkerElement(),
      anchor: "center",
    });
    markerRef.current = marker;

    return () => {
      cancelAnimationFrame(raf);
      marker.remove();
      markerRef.current = null;
      onReadyRef.current?.(null);
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
    // Mount only. `date` is applied in its own effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the date when the core moves it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const layer = imageryLayerFor(date) ?? IMAGERY.modisTerra;
    const source = map.getSource("imagery") as RasterTileSource | undefined;
    if (source && typeof source.setTiles === "function") {
      source.setTiles(datedTiles(layer, date));
    }
  }, [date, loaded]);

  // Dive to a place, or climb back to the globe.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const reduced = prefersReducedMotion();

    const narrow = window.matchMedia("(max-width: 680px)").matches;

    if (place) {
      spinRef.current.enabled = false;
      lastPlaceRef.current = place;
      map.stop();
      if (reduced) {
        map.jumpTo({ center: [place.lon, place.lat], zoom: PLACE_ZOOM });
      } else {
        map.flyTo({
          center: [place.lon, place.lat],
          zoom: PLACE_ZOOM,
          duration: 2600,
          curve: 1.6,
          padding: narrow
            ? { top: 64, bottom: Math.round(window.innerHeight * 0.5) + 104, left: 0, right: 0 }
            : { top: 72, bottom: 312, left: 0, right: 120 },
          essential: true,
        });
      }
      markerRef.current?.setLngLat([place.lon, place.lat]).addTo(map);
    } else {
      markerRef.current?.remove();
      const home = lastPlaceRef.current ?? { lon: HOME_CENTER[0], lat: HOME_CENTER[1] };
      map.stop();
      if (reduced) {
        map.jumpTo({ center: [home.lon, home.lat], zoom: HOME_ZOOM });
        spinRef.current.enabled = false;
      } else {
        map.flyTo({
          center: [home.lon, home.lat],
          zoom: HOME_ZOOM,
          duration: 1500,
          essential: true,
        });
        map.once("moveend", () => {
          spinRef.current.last = 0;
          spinRef.current.enabled = !prefersReducedMotion();
        });
      }
    }
  }, [place, loaded]);

  return (
    <div className="earth-map" aria-label="Interactive Earth map">
      <div ref={containerRef} className="earth-map__canvas" />
      {!loaded && !failed && (
        <div className="earth-map__status" role="status">
          <span className="earth-map__pulse" aria-hidden="true" />
          Loading the globe
        </div>
      )}
      {failed && (
        <div className="earth-map__error" role="alert">
          <p>This browser could not start the 3D map.</p>
          <p className="earth-map__error-hint">
            Try Chrome, Firefox or Safari with hardware acceleration turned on.
          </p>
        </div>
      )}
    </div>
  );
}
