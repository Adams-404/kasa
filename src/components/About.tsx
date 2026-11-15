import { useEffect, useRef } from "react";

type AboutProps = {
  open: boolean;
  onClose: () => void;
};

export default function About({ open, onClose }: AboutProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="about-scrim" onClick={onClose}>
      <div
        className="about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="about__head">
          <h2 id="about-title" className="about__title">
            What Kasa does
          </h2>
          <button ref={closeRef} type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="about__lede">
          Pick any point on Earth. Kasa shows the satellite view, the years of change, and a
          statistical test of whether that change is real.
        </p>

        <p>
          Built for the NASA International Space Apps Challenge 2026, for the challenge
          <em> Be An Earth System Trend Detective</em>.
        </p>

        <h3 className="about__sub">Data</h3>
        <ul className="about__list">
          <li>
            Satellite imagery:{" "}
            <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">
              NASA GIBS
            </a>{" "}
            (MODIS and VIIRS corrected reflectance, Blue Marble).
          </li>
          <li>
            The imagery product is land surface reflectance: open ocean has no imagery,
            though the climate series still covers it.
          </li>
          <li>
            Climate series:{" "}
            <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">
              NASA POWER
            </a>
            , MERRA-2 based, on a roughly 0.5° model grid. A point is a grid cell, not a
            weather station.
          </li>
          <li>
            Place history:{" "}
            <a href="https://www.wikipedia.org/" target="_blank" rel="noreferrer">
              Wikipedia
            </a>{" "}
            (CC BY-SA) and{" "}
            <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer">
              Wikidata
            </a>
            .
          </li>
          <li>
            Place search:{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>{" "}
            via Nominatim.
          </li>
          <li>
            News:{" "}
            <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer">
              GDELT Project
            </a>
            .
          </li>
        </ul>

        <p className="about__foot">
          NASA does not endorse this project. Built in Gombe, Nigeria.
        </p>
      </div>
    </div>
  );
}
