import { useState } from "react";
import type { Place } from "../lib/format";
import { parseCoordinates } from "../lib/search";
import { searchPlaces, type PlaceHit } from "../lib/api/nominatim";

type SearchBoxProps = {
  onPick: (place: Place) => void;
};

/**
 * One rule and a label: search fires on submit, never as you type. Nominatim's
 * usage policy bans autocomplete outright, and it is the right behaviour here
 * anyway: a place is a deliberate answer, not a dropdown to flick through.
 */
export default function SearchBox({ onPick }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<PlaceHit>>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    const coordinates = parseCoordinates(value);
    if (coordinates) {
      setResults([]);
      setMessage("");
      setStatus("idle");
      setQuery("");
      onPick({ ...coordinates, name: "" });
      return;
    }

    setStatus("loading");
    setMessage("");
    setResults([]);
    try {
      const hits = await searchPlaces(value);
      setResults(hits);
      setStatus("idle");
      if (hits.length === 0) {
        setMessage("No place matched that search. Try a town, a region, or paste coordinates.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Search failed. Try again.");
    }
  };

  const choose = (hit: PlaceHit) => {
    setResults([]);
    setMessage("");
    setQuery(hit.name);
    onPick({ lat: hit.lat, lon: hit.lon, name: hit.name, detail: hit.detail || undefined });
  };

  return (
    <form className="search" role="search" onSubmit={submit}>
      <label className="search__label" htmlFor="place-search">
        Search a place, or paste coordinates
      </label>
      <div className="search__row">
        <input
          id="place-search"
          className="search__input"
          type="text"
          name="q"
          autoComplete="off"
          spellCheck={false}
          placeholder="Gombe, Nigeria  ·  10.29, 11.17"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (status === "error") setStatus("idle");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setResults([]);
              setMessage("");
            }
          }}
        />
        <button type="submit" className="search__submit" disabled={status === "loading"}>
          {status === "loading" ? "Searching" : "Find"}
        </button>
      </div>

      <p className="search__note">
        {status === "loading"
          ? "Asking OpenStreetMap…"
          : status === "error"
            ? message
            : "Search by OpenStreetMap Nominatim. Searches run on submit only."}
      </p>

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((hit) => (
            <li key={`${hit.lat},${hit.lon},${hit.name}`}>
              <button type="button" className="search-result" onClick={() => choose(hit)}>
                <span className="search-result__name">{hit.name}</span>
                {hit.detail && <span className="search-result__detail">{hit.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {status === "idle" && results.length === 0 && message && (
        <p className="search__empty">{message}</p>
      )}
    </form>
  );
}
