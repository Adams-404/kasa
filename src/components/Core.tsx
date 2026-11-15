import { useEffect, useRef, useState } from "react";

/**
 * The core: a vertical strip of year bands, one band per year.
 * Dragging it scrubs time. Keyboard arrows do the same.
 *
 * On a narrow screen it lies down and becomes a horizontal strip.
 */
type CoreProps = {
  years: Array<number>;
  value: number;
  onChange: (year: number) => void;
};

export default function Core({ years, value, onChange }: CoreProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const horizontal = useHorizontal();

  const index = Math.max(0, years.indexOf(value));

  const pick = (clientX: number, clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = horizontal
      ? (clientX - rect.left) / rect.width
      : (clientY - rect.top) / rect.height;
    const clamped = Math.min(0.999, Math.max(0, ratio));
    const next = years[Math.floor(clamped * years.length)];
    if (next !== undefined && next !== value) onChange(next);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    pick(event.clientX, event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    pick(event.clientX, event.clientY);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? years.length - 1
          : Math.min(years.length - 1, Math.max(0, index + step));
    onChange(years[nextIndex]);
  };

  return (
    <div className={`core${horizontal ? " core--flat" : ""}${dragging ? " is-dragging" : ""}`}>
      <div className="core__head">
        <span className="core__title">The core</span>
        <span className="core__hint">{horizontal ? "Drag to scrub" : "Drag to scrub"}</span>
      </div>
      <div
        ref={trackRef}
        className="core__track"
        role="slider"
        tabIndex={0}
        aria-label="Year of satellite imagery"
        aria-orientation={horizontal ? "horizontal" : "vertical"}
        aria-valuemin={years[0]}
        aria-valuemax={years[years.length - 1]}
        aria-valuenow={value}
        aria-valuetext={String(value)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {years.map((year) => (
          <div
            key={year}
            className={`core__band${year === value ? " is-active" : ""}`}
            aria-hidden="true"
          >
            <span className="core__year num">{year}</span>
            <span className="core__rule" />
          </div>
        ))}
      </div>
    </div>
  );
}

function useHorizontal(): boolean {
  const query = "(max-width: 680px)";
  const [horizontal, setHorizontal] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setHorizontal(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return horizontal;
}
