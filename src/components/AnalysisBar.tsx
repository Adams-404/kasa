import { useState } from "react";
import type { Place } from "../lib/format";
import { useTrend } from "../lib/useTrend";
import { VARIABLES, VARIABLE_ORDER, type VariableId } from "../lib/variables";
import { formatPValue } from "../lib/stats/verdict";
import TrendChart from "./TrendChart";
import AskTab from "./AskTab";
import { IMAGERY, imageryLayerFor } from "../lib/gibs";

type AnalysisBarProps = {
  place: Place;
  /** Year currently shown in the core. */
  selectedYear: number;
  /** Years the core can actually show, so a chart click never sets a dead year. */
  coreYears: ReadonlyArray<number>;
  onSelectYear: (year: number) => void;
  /** Imagery date in the core, so the assistant knows what the person is seeing. */
  imageryDate: string;
};

const WINDOWS = [10, 40] as const;

/**
 * The challenge answer: for this point, test the last ten (or forty) years of
 * NASA POWER data and say plainly what the numbers support.
 */
export default function AnalysisBar({
  place,
  selectedYear,
  coreYears,
  onSelectYear,
  imageryDate,
}: AnalysisBarProps) {
  const [windowYears, setWindowYears] = useState<number>(WINDOWS[0]);
  const [variable, setVariable] = useState<VariableId>("T2M");
  const [tab, setTab] = useState<"chart" | "ask">("chart");
  const imagery = imageryLayerFor(imageryDate) ?? IMAGERY.terraComposite;
  const { state, reload } = useTrend(place, windowYears);

  const spec = VARIABLES[variable];
  const analysis = state.status === "ready" ? state.analyses[variable] : null;

  const selectYear = (year: number) => {
    if (coreYears.includes(year)) onSelectYear(year);
  };

  const extend = () =>
    setWindowYears((current) => (current === WINDOWS[0] ? WINDOWS[1] : WINDOWS[0]));

  return (
    <section
      className={`analysis${tab === "ask" ? " analysis--ask" : ""}`}
      aria-label="Trend analysis"
    >
      <header className="analysis__head">
        <div className="analysis__vars">
          <div className="tabs" role="tablist" aria-label="Place data">
            {VARIABLE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === "chart" && variable === id}
                className={`tab${tab === "chart" && variable === id ? " is-active" : ""}`}
                onClick={() => {
                  setVariable(id);
                  setTab("chart");
                }}
              >
                {VARIABLES[id].label}
              </button>
            ))}
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ask"}
              className={`tab${tab === "ask" ? " is-active" : ""}`}
              onClick={() => setTab("ask")}
            >
              Ask
            </button>
          </div>
          <p className="analysis__definition">
            {tab === "ask"
              ? "Answers come from this page's data only, and say so when it runs out."
              : spec.definition}
          </p>
        </div>

        {tab === "chart" && analysis && (
          <p className="analysis__window num">
            <span>{analysis.startYear}–{analysis.endYear}</span>
            <span className="analysis__window-sep">·</span>
            <span>{analysis.annual.years.length} years</span>
            {analysis.significant && (
              <span className="analysis__flag">
                <span className="analysis__flag-dot" aria-hidden="true" />
                significant
              </span>
            )}
          </p>
        )}
      </header>

      {tab === "ask" && (
        <AskTab
          place={place}
          imageryDate={imageryDate}
          imageryLabel={imagery.label}
          windowYears={windowYears}
          analyses={state.status === "ready" ? state.analyses : {}}
        />
      )}

      {tab === "chart" && state.status === "loading" && (
        <div className="analysis__state" role="status">
          <span className="analysis__pulse" aria-hidden="true" />
          <p>Reading NASA POWER for this point…</p>
        </div>
      )}

      {tab === "chart" && state.status === "error" && (
        <div className="analysis__state analysis__state--error" role="alert">
          <p>{state.message}</p>
          <button type="button" className="ghost-button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {tab === "chart" && state.status === "ready" && analysis && (
        <>
          <div className="analysis__body">
            <div className="analysis__chart">
              {analysis.annual.years.length >= 2 && (
                <p className="analysis__legend">
                  <span className="key key--up" aria-hidden="true" />{" "}
                  {variable === "T2M" ? "warmer" : "wetter"}
                  <span className="key key--down" aria-hidden="true" />{" "}
                  {variable === "T2M" ? "cooler" : "drier"}
                  <span className="key key--fit" aria-hidden="true" /> fitted change
                </p>
              )}
              {analysis.annual.years.length >= 2 ? (
                <TrendChart
                  analysis={analysis}
                  selectedYear={selectedYear}
                  onSelectYear={selectYear}
                />
              ) : (
                <p className="analysis__empty">
                  NASA POWER returned no complete years for this window, so there is nothing
                  to test. Try another point nearby.
                </p>
              )}
            </div>

            <div className="analysis__read">
              <p
                className={`verdict${
                  analysis.significant ? " verdict--significant" : " verdict--quiet"
                }`}
              >
                {analysis.verdict.statement}
              </p>
              <p className="analysis__detail">{analysis.verdict.detail}</p>

              <dl className="stats">
                <div className="stat">
                  <dt>Per decade</dt>
                  <dd className="num">
                    {formatSlope(analysis.slopePerDecade, spec.decimals)}{" "}
                    <span className="stat__unit">{spec.unit}</span>
                  </dd>
                </div>
                <div className="stat">
                  <dt>p-value</dt>
                  <dd className="num">{formatPValue(analysis.mk.p)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <footer className="analysis__foot">
            <div className="analysis__foot-main">
              {analysis.verdict.caveat ? (
                <p className="analysis__caveat">{analysis.verdict.caveat}</p>
              ) : (
                <p className="analysis__caveat">
                  Even forty years is one window in a longer record; read this as this
                  window's evidence, not a verdict on the climate.
                </p>
              )}
              <button type="button" className="ghost-button" onClick={extend}>
                {windowYears === WINDOWS[0] ? "Extend to 40 years" : "Back to 10 years"}
              </button>
            </div>
            <p className="analysis__source">
              NASA POWER · MERRA-2 reanalysis, a ~0.5° grid cell, not a weather station
              {" · "}
              {analysis.mk.method === "exact" ? "Mann-Kendall exact test" : "Mann-Kendall test"}
              {" · Theil-Sen slope · seasonal cycle removed before testing"}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}

function formatSlope(value: number, decimals: number): string {
  const magnitude = Math.abs(value).toFixed(decimals);
  if (Number(magnitude) === 0) return "0";
  return `${value > 0 ? "+" : "−"}${magnitude}`;
}
