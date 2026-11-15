import { useEffect, useId, useRef, useState } from "react";
import type { TrendAnalysis } from "../lib/stats/analyse";

type TrendChartProps = {
  analysis: TrendAnalysis;
  /** Highlight this year, and let a click move the core to it. */
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
};

/**
 * Annual anomalies as bars around zero, with the Theil-Sen fit laid over them.
 * One shared scale across every year, so the shape of the decade is honest:
 * a trend is a slope in this chart, not a caption.
 *
 * The width is measured rather than scaled by viewBox, so labels stay 10px on
 * a phone instead of shrinking with the chart.
 */
const H = 152;
const PAD = { top: 14, right: 10, bottom: 22, left: 10 };

export default function TrendChart({ analysis, selectedYear, onSelectYear }: TrendChartProps) {
  const clipId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { years, anomalies } = analysis.annual;
  const n = years.length;
  if (n < 2) return null;

  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxAbs = Math.max(0.0001, ...anomalies.map((v) => Math.abs(v))) * 1.12;
  const zeroY = PAD.top + plotH / 2;
  const step = plotW / n;
  const barW = Math.max(2, Math.min(16, step * 0.56));

  const y = (value: number) => zeroY - (value / maxAbs) * (plotH / 2);
  const xAt = (index: number) => PAD.left + step * (index + 0.5);

  const fitY = (year: number) =>
    analysis.slope.intercept + analysis.slope.slope * year;

  const selectedIndex = selectedYear === undefined ? -1 : years.indexOf(selectedYear);

  const pick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onSelectYear) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.min(n - 1, Math.max(0, Math.floor(ratio * n)));
    onSelectYear(years[index]);
  };

  const decimals = analysis.spec.decimals;
  const label = `${analysis.spec.label} annual anomalies, ${years[0]} to ${
    years[n - 1]
  }. Fitted change ${analysis.slopePerDecade.toFixed(decimals)} ${
    analysis.spec.unit
  } per decade.`;

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        className={`chart${onSelectYear ? " chart--pickable" : ""}`}
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label={label}
        onClick={pick}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top - 6} width={plotW} height={plotH + 12} />
          </clipPath>
        </defs>

        <line
          className="chart__zero"
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={zeroY}
          y2={zeroY}
        />

        <g clipPath={`url(#${clipId})`}>
          {years.map((year, index) => {
            const value = anomalies[index];
            const top = Math.min(zeroY, y(value));
            const height = Math.max(1, Math.abs(zeroY - y(value)));
            return (
              <rect
                key={year}
                className={value >= 0 ? "chart__bar chart__bar--up" : "chart__bar chart__bar--down"}
                x={xAt(index) - barW / 2}
                y={top}
                width={barW}
                height={height}
              />
            );
          })}

          <line
            className="chart__fit"
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(fitY(years[0]))}
            y2={y(fitY(years[n - 1]))}
          />
        </g>

        {selectedIndex >= 0 && (
          <g className="chart__selected">
            <line
              x1={xAt(selectedIndex)}
              x2={xAt(selectedIndex)}
              y1={PAD.top - 4}
              y2={PAD.top + plotH}
            />
            <circle cx={xAt(selectedIndex)} cy={y(anomalies[selectedIndex])} r={3.2} />
          </g>
        )}

        <g className="chart__ticks" aria-hidden="true">
          <text x={PAD.left} y={H - 5} textAnchor="start">
            {years[0]}
          </text>
          {n > 4 && (
            <text x={PAD.left + plotW / 2} y={H - 5} textAnchor="middle">
              {years[Math.floor((n - 1) / 2)]}
            </text>
          )}
          <text x={PAD.left + plotW} y={H - 5} textAnchor="end">
            {years[n - 1]}
          </text>
        </g>
      </svg>
    </div>
  );
}
