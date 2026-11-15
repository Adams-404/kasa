import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  type RasterTileSource,
} from "maplibre-gl";
import { IMAGERY, datedTiles, imageryLayerFor } from "../lib/gibs";
import { buildMapStyle } from "../lib/mapStyle";
import { buildMarkerElement } from "../lib/marker";
import type { Place } from "../lib/format";

/**
 * The comparison map.
 *
 * It is a second MapLibre map, full screen and hidden under the main one, with
 * the same style and camera. A `clip-path` reveals only the left slice, so the
 * left of the divider shows the comparison year and the right shows the year
 * the core is on. Because both maps render the same camera, the seam is only the
 * divider line — there is no second projection to line up.
 *
 * The map is non-interactive: it exists to be dragged over, never touched.
 */
type CompareMapProps = {
  /** ISO date for the comparison year. */
  date: string;
  /** Comparison year, shown on the left of the divider. */
  year: number;
  /** Year the main map is showing, on the right. */
  mainYear: number;
  mainMap: MapLibreMap | null;
  /** The selected point, so its dot appears on this side of the divider too. */
  place: Place;
};

const MIN_SPLIT = 8;
const MAX_SPLIT = 92;
const START_SPLIT = 50;

export default function CompareMap({
  date,
  year,
  mainYear,
  mainMap,
  place,
}: CompareMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [split, setSplit] = useState(START_SPLIT);
  const [dragging, setDragging] = useState(false);

  // Create once. `date` is applied in its own effect below.
  useEffect(() => {
    if (!containerRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: buildMapStyle(date),
        center: [0, 0],
        zoom: 1,
        minZoom: 0.4,
        maxZoom: 16,
        renderWorldCopies: false,
        interactive: false,
        attributionControl: false,
      });
    } catch {
      return;
    }

    mapRef.current = map;
    map.once("load", () => setReady(true));

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Mount only: the date is applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The same dot the main map shows, so the seam does not swallow it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!markerRef.current) {
      markerRef.current = new Marker({
        element: buildMarkerElement(),
        anchor: "center",
      });
    }
    markerRef.current.setLngLat([place.lon, place.lat]).addTo(map);
    return () => {
      markerRef.current?.remove();
    };
  }, [ready, place.lon, place.lat]);

  // Follow the comparison date when the select changes it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const layer = imageryLayerFor(date) ?? IMAGERY.modisTerra;
    const source = map.getSource("imagery") as RasterTileSource | undefined;
    if (source && typeof source.setTiles === "function") {
      source.setTiles(datedTiles(layer, date));
    }
  }, [date, ready]);

  // Follow the main camera exactly. `jumpTo` keeps the two frames in lockstep;
  // easing here would let the images drift apart mid-gesture.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !mainMap) return;

    const sync = () => {
      map.jumpTo({
        center: mainMap.getCenter(),
        zoom: mainMap.getZoom(),
        bearing: mainMap.getBearing(),
        pitch: mainMap.getPitch(),
        // The dive flies with padding so the place sits above the band; the
        // comparison map must inherit it or the two frames would be offset.
        padding: mainMap.getPadding(),
      });
    };

    sync();
    mainMap.on("move", sync);

    return () => {
      mainMap.off("move", sync);
    };
  }, [ready, mainMap]);

  const setFromClientX = (clientX: number) => {
    const percent = (clientX / window.innerWidth) * 100;
    setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, percent)));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setFromClientX(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(event.clientX);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 2;
    setSplit((value) => {
      if (event.key === "Home") return MIN_SPLIT;
      if (event.key === "End") return MAX_SPLIT;
      const delta = event.key === "ArrowRight" ? step : -step;
      return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value + delta));
    });
  };

  return (
    <div
      className={`compare${ready ? " is-ready" : ""}${dragging ? " is-dragging" : ""}`}
    >
      <div
        className="compare__clip"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        aria-hidden="true"
      >
        <div ref={containerRef} className="compare__canvas" />
      </div>

      <div
        className="compare__drag"
        style={{ left: `${split}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Comparison divider"
        aria-orientation="horizontal"
        aria-valuemin={MIN_SPLIT}
        aria-valuemax={MAX_SPLIT}
        aria-valuenow={Math.round(split)}
        aria-valuetext={`${year} on the left, ${mainYear} on the right`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <span className="compare__line" aria-hidden="true" />
        <div className="compare__handle" aria-hidden="true">
          <span className="compare__year num">{year}</span>
          <span className="compare__grip" />
          <span className="compare__year compare__year--main num">{mainYear}</span>
        </div>
      </div>
    </div>
  );
}
