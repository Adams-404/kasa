import { useEffect, useRef } from "react";
import type { Place } from "../lib/format";
import { useHistory } from "../lib/useHistory";

type HistoryPanelProps = {
  place: Place;
  open: boolean;
  onClose: () => void;
};

/**
 * History and culture for the selected point: Wikipedia text, a few Wikidata
 * facts, and an honest empty state when the nearest article is far away.
 */
export default function HistoryPanel({ place, open, onClose }: HistoryPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { state, select, reload } = useHistory(place, open);

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

  const entry = state.status === "ready" ? state.entry : null;
  const nearby = state.status === "ready" ? state.nearby : [];

  return (
    <div className="about-scrim" onClick={onClose}>
      <aside
        className="about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="about__head">
          <h2 id="history-title" className="about__title">
            History
          </h2>
          <button ref={closeRef} type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </div>

        {state.status === "loading" && (
          <p className="history__state" role="status">
            Looking for articles near this point…
          </p>
        )}

        {state.status === "error" && (
          <div className="history__state" role="alert">
            <p>{state.message}</p>
            <button type="button" className="ghost-button" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {state.status === "ready" && entry === null && (
          <div className="history__state">
            <p>
              No encyclopedia entry within 10 km of this point. Small settlements and open
              water often have none — that is a coverage gap, not a claim that nothing is
              there.
            </p>
            {nearby.length === 0 && (
              <p className="history__hint">
                Try a nearby town, or another point on the map.
              </p>
            )}
          </div>
        )}

        {entry && (
          <article className="history">
            <h3 className="history__place">{entry.title}</h3>
            {entry.description && <p className="history__deck">{entry.description}</p>}

            <p className="history__extract">{entry.extract}</p>

            <dl className="facts">
              {entry.facts.population !== undefined && (
                <div className="fact">
                  <dt>Population</dt>
                  <dd className="num">
                    {entry.facts.population.toLocaleString("en")}
                    {entry.facts.populationYear && (
                      <span className="fact__note"> {entry.facts.populationYear}</span>
                    )}
                  </dd>
                </div>
              )}
              {entry.facts.region && entry.facts.region !== entry.facts.country && (
                <div className="fact">
                  <dt>Region</dt>
                  <dd>{entry.facts.region}</dd>
                </div>
              )}
              {entry.facts.country && (
                <div className="fact">
                  <dt>Country</dt>
                  <dd>{entry.facts.country}</dd>
                </div>
              )}
              {entry.facts.founded && (
                <div className="fact">
                  <dt>Founded</dt>
                  <dd className="num">{entry.facts.founded}</dd>
                </div>
              )}
            </dl>

            <p className="history__source">
              {formatDistance(entry.distanceMetres)} from this point · Wikipedia, CC BY-SA ·
              facts from Wikidata
            </p>
            <a className="history__link" href={entry.url} target="_blank" rel="noreferrer">
              Read the full article on Wikipedia
            </a>

            {nearby.length > 1 && (
              <section className="nearby">
                <h4 className="nearby__title">Also nearby</h4>
                <ul className="nearby__list">
                  {nearby
                    .filter((article) => article.title !== entry.title)
                    .slice(0, 6)
                    .map((article) => (
                      <li key={article.title}>
                        <button
                          type="button"
                          className="nearby__link"
                          onClick={() => select(article.title)}
                        >
                          <span>{article.title}</span>
                          <span className="nearby__distance num">
                            {formatDistance(article.distanceMetres)}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </article>
        )}
      </aside>
    </div>
  );
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
