import { useCallback, useEffect, useMemo, useState } from "react";
import EarthMap from "../components/EarthMap";
import GlobeScreen from "../components/GlobeScreen";
import PlaceView from "../components/PlaceView";
import Core from "../components/Core";
import About from "../components/About";
import { formatLatLon, type Place } from "../lib/format";
import { lastCompleteYear, sampleDate, yearWindow } from "../lib/time";

const WINDOW_YEARS = 10;

export default function App() {
  const endYear = useMemo(() => lastCompleteYear(), []);
  const years = useMemo(() => yearWindow(WINDOW_YEARS, endYear), [endYear]);

  const [place, setPlace] = useState<Place | null>(null);
  const [year, setYear] = useState(endYear);
  const [aboutOpen, setAboutOpen] = useState(false);

  const date = sampleDate(year);

  const pick = useCallback((next: Place) => {
    setPlace({
      ...next,
      name: next.name || formatLatLon(next.lat, next.lon),
    });
  }, []);

  const goHome = useCallback(() => setPlace(null), []);

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
    <main className="app">
      <EarthMap place={place} date={date} onPick={pick} />
      {place ? (
        <>
          <PlaceView place={place} date={date} onBack={goHome} />
          <Core years={years} value={year} onChange={setYear} />
        </>
      ) : (
        <GlobeScreen onPick={pick} onAbout={() => setAboutOpen(true)} />
      )}
      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
