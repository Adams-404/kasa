import type { VariableSpec } from "./stats/analyse";

export type VariableId = "T2M" | "PRECTOTCORR";

/**
 * The two variables we expose. `definition` exists because the challenge brief
 * asks for plain definitions for a high-school audience.
 */
export const VARIABLES: Record<VariableId, VariableSpec> = {
  T2M: {
    id: "T2M",
    label: "Temperature",
    unit: "°C",
    decimals: 1,
    definition: "Air temperature two metres above the ground, averaged over each month.",
  },
  PRECTOTCORR: {
    id: "PRECTOTCORR",
    label: "Rainfall",
    unit: "mm/day",
    decimals: 2,
    definition: "Rainfall per day, averaged over each month. It is a rate, not a monthly total.",
  },
};

export const VARIABLE_ORDER: Array<VariableId> = ["T2M", "PRECTOTCORR"];
