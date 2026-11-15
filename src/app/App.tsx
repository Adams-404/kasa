import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EarthMap from "../components/EarthMap";
import GlobeScreen from "../components/GlobeScreen";
import PlaceView from "../components/PlaceView";
import Core from "../components/Core";
import AnalysisBar from "../components/AnalysisBar";
import About from "../components/About";
import HistoryPanel from "../components/HistoryPanel";
import { formatLatLon, type Place } from "../lib/format";
import { lastCompleteYear, sampleDate, yearWindow } from "../lib/time";
import { reversePlace } from "../lib/api/nominatim";

const WINDOW_YEARS = 10;

export default function App() {
  const endYear = useMemo(() => lastCompleteYear(), []);
  const years = useMemo(() => yearWindow(WINDOW_YEARS, endYear), [endYear]);

  const [place, setPlace] = useState<Place | null>(null);
  const [year, setYear] = useState(endYear);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const date = sampleDate(year);

  const pickSeq = useRef(0);

  const pick = useCallback((next: Place) => {
    const seq = ++pickSeq.current;
    setPlace({
      ...next,
      name: next.name || formatLatLon(next.lat, next.lon),
    });

    // A bare click gets a real name when OpenStreetMap knows one, and keeps the
    // coordinates when it does not. Late answers for an abandoned click are ignored.
    if (next.name) return;
    reversePlace(next.lat, next.lon)
      .then((found) => {
        if (!found || seq !== pickSeq.current) return;
        setPlace((current) =>
          current && current.lat === next.lat && current.lon === next.lon
            ? { ...current, name: found.name, detail: found.detail }
            : current,
        );
      })
      .catch(() => {
        // Coordinates are an honest label when the lookup fails.
      });
  }, []);

  const goHome = useCallback(() => {
    pickSeq.current += 1;
    setHistoryOpen(false);
    setPlace(null);
  }, []);

  // A chart click can only move the core to a year the core actually shows.
  const selectYear = useCallback(
    (next: number) => {
      if (years.includes(next)) setYear(next);
    },
    [years],
  );

  // Deep link for the demo and for QA: /#at=10.29,11.17
  useEffect(() => {
    const match = /^at=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(
      window.location.hash.replace(/^#/, ""),
    );
    if (!match) return;
    pick({ lat: Number(match[1]), lon: Number(match[2]), name: "" });
  }, [pick]);

  useEffect(() => {
    if (!place) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlace(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place]);

  return (
    <main className={`app${place ? " app--place" : ""}`}>
      <EarthMap place={place} date={date} onPick={pick} />
      {place ? (
        <>
          <PlaceView
            place={place}
            date={date}
            onBack={goHome}
            onHistory={() => setHistoryOpen(true)}
          />
          <AnalysisBar
            place={place}
            selectedYear={year}
            coreYears={years}
            onSelectYear={selectYear}
          />
          <Core years={years} value={year} onChange={setYear} />
        </>
      ) : (
        <GlobeScreen onPick={pick} onAbout={() => setAboutOpen(true)} />
      )}
      {place && (
        <HistoryPanel
          place={place}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
