import { useCallback, useEffect, useState } from "react";
import EarthMap from "../components/EarthMap";
import GlobeScreen from "../components/GlobeScreen";
import PlaceView from "../components/PlaceView";
import About from "../components/About";
import { IMAGERY_LAG_DAYS } from "../lib/gibs";
import { daysAgo } from "../lib/dates";
import { formatLatLon, type Place } from "../lib/format";

export default function App() {
  const [place, setPlace] = useState<Place | null>(null);
  const [date] = useState(() => daysAgo(IMAGERY_LAG_DAYS));
  const [aboutOpen, setAboutOpen] = useState(false);

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
        <PlaceView place={place} date={date} onBack={goHome} />
      ) : (
        <GlobeScreen onPick={pick} onAbout={() => setAboutOpen(true)} />
      )}
      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
