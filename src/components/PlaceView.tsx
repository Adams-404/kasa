import type { Place } from "../lib/format";
import { formatLatLon } from "../lib/format";
import { formatDateRange } from "../lib/dates";
import { IMAGERY, imageryLayerFor } from "../lib/gibs";
import { compositeEnd } from "../lib/time";

type PlaceViewProps = {
  place: Place;
  date: string;
  onBack: () => void;
};

export default function PlaceView({ place, date, onBack }: PlaceViewProps) {
  const layer = imageryLayerFor(date) ?? IMAGERY.terraComposite;
  const coords = formatLatLon(place.lat, place.lon);
  // While search is unbuilt, the name is the coordinates. Do not print them twice.
  const subtitle = place.detail ?? (place.name === coords ? "" : coords);

  return (
    <>
      <header className="topbar topbar--place">
        <button type="button" className="back-link" onClick={onBack}>
          <span aria-hidden="true">←</span> Globe
        </button>
        <div className="place-title">
          <h1 className="place-title__name">{place.name || "Unnamed point"}</h1>
          {subtitle && (
            <p className="place-title__coords num">
              {place.detail ? `${place.detail} · ${coords}` : subtitle}
            </p>
          )}
        </div>
      </header>

      <div className="date-card">
        <p className="date-card__label">Imagery period</p>
        <p className="date-card__value num">{formatDateRange(date, compositeEnd(date))}</p>
        <p className="date-card__source">{layer.label}</p>
      </div>
    </>
  );
}
