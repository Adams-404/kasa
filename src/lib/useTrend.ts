import { useCallback, useEffect, useState } from "react";
import type { Place } from "./format";
import { fetchPowerSeries, type PowerSeries } from "./api/power";
import { analyseSeries, type TrendAnalysis } from "./stats/analyse";
import { VARIABLES, VARIABLE_ORDER, type VariableId } from "./variables";
import { lastCompleteYear } from "./time";

export type TrendState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      analyses: Record<VariableId, TrendAnalysis>;
      power: PowerSeries;
    };

export function useTrend(place: Place | null, windowYears: number): {
  state: TrendState;
  reload: () => void;
} {
  const [state, setState] = useState<TrendState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!place) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const endYear = lastCompleteYear();
    const startYear = endYear - windowYears + 1;

    fetchPowerSeries(place.lat, place.lon, startYear, endYear, VARIABLE_ORDER)
      .then((power) => {
        if (cancelled) return;
        const analyses = {} as Record<VariableId, TrendAnalysis>;
        for (const id of VARIABLE_ORDER) {
          analyses[id] = analyseSeries(power.series[id] ?? [], VARIABLES[id]);
        }
        setState({ status: "ready", analyses, power });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load NASA data for this point.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [place, windowYears, attempt]);

  return { state, reload };
}
