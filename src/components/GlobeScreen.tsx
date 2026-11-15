import type { Place } from "../lib/format";
import { DEMO_PLACES } from "../lib/demoPlaces";
import SearchBox from "./SearchBox";

type GlobeScreenProps = {
  onPick: (place: Place) => void;
  onAbout: () => void;
};

export default function GlobeScreen({ onPick, onAbout }: GlobeScreenProps) {
  return (
    <div className="globe-ui">
      <header className="topbar">
        <div className="wordmark">
          <h1 className="wordmark__name">Kasa</h1>
          <p className="wordmark__line">Earth, read in layers.</p>
        </div>
        <button type="button" className="text-link" onClick={onAbout}>
          About
        </button>
      </header>

      <div className="globe-intro">
        <div className="hero-panel">
          <div className="hero-panel__kicker">
            <span className="hero-panel__dot" aria-hidden="true" />
            Earth system explorer
          </div>
          <h2 className="hero-panel__title">Read any place like a core sample.</h2>
          <p className="hero-panel__copy">
            Move through satellite time, climate signals, and the story of the ground beneath
            you.
          </p>

          <SearchBox onPick={onPick} />

          <div className="hero-panel__rule" />
          <p className="globe-foot__hint">
            Or click anywhere on the globe to open that place.
          </p>

          <div className="globe-foot__demo">
            <span className="globe-foot__label">Try a field site</span>
            <ul className="demo-list">
              {DEMO_PLACES.map((item) => (
                <li key={item.label}>
                  <button type="button" className="demo-link" onClick={() => onPick(item.place)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-panel__sources">
            <span>NASA imagery</span>
            <span>POWER climate data</span>
            <span>OpenStreetMap detail</span>
          </div>
        </div>
      </div>
    </div>
  );
}
