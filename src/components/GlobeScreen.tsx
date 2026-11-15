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
          <p className="wordmark__line">Read any place on Earth like a core sample.</p>
        </div>
        <button type="button" className="text-link" onClick={onAbout}>
          About
        </button>
      </header>

      <div className="globe-intro">
        <SearchBox onPick={onPick} />

        <p className="globe-foot__hint">Click anywhere on the globe to open that place.</p>

        <div className="globe-foot__demo">
          <span className="globe-foot__label">Start with</span>
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
      </div>
    </div>
  );
}
