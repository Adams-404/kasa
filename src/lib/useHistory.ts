import { useCallback, useEffect, useState } from "react";
import type { Place } from "./format";
import {
  loadHistory,
  type HistoryEntry,
  type NearbyArticle,
} from "./api/wikipedia";

export type HistoryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entry: HistoryEntry | null; nearby: Array<NearbyArticle> };

/**
 * Loaded lazily: nothing is fetched until the history panel is opened, so a
 * quick dive stays quick on a bad venue network.
 */
export function useHistory(place: Place | null, open: boolean) {
  const [selected, setSelected] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HistoryState>({ status: "idle" });

  // A new place starts from its nearest article again.
  useEffect(() => {
    setSelected(null);
  }, [place?.lat, place?.lon]);

  useEffect(() => {
    if (!open || !place) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    loadHistory(place.lat, place.lon, selected ?? undefined)
      .then((result) => {
        if (!cancelled) setState({ status: "ready", ...result });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Could not load the history for this point.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [place, open, selected, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, select: setSelected, reload };
}
