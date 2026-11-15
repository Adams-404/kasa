import { describe, expect, it } from "vitest";
import { parseCoordinates } from "./search";

describe("coordinate input", () => {
  it("reads a comma-separated pair", () => {
    expect(parseCoordinates("10.29, 11.17")).toEqual({ lat: 10.29, lon: 11.17 });
  });

  it("reads a space-separated pair", () => {
    expect(parseCoordinates("10.29 11.17")).toEqual({ lat: 10.29, lon: 11.17 });
  });

  it("reads hemisphere letters and negatives", () => {
    expect(parseCoordinates("10.29S, 11.17W")).toEqual({ lat: -10.29, lon: -11.17 });
    expect(parseCoordinates("33.45N 70.66W")).toEqual({ lat: 33.45, lon: -70.66 });
    expect(parseCoordinates("-10.29, -11.17")).toEqual({ lat: -10.29, lon: -11.17 });
  });

  it("does not confuse a place name for coordinates", () => {
    expect(parseCoordinates("Gombe, Nigeria")).toBeNull();
    expect(parseCoordinates("Lake Chad")).toBeNull();
    expect(parseCoordinates("")).toBeNull();
  });

  it("rejects values off the globe", () => {
    expect(parseCoordinates("91, 0")).toBeNull();
    expect(parseCoordinates("0, 181")).toBeNull();
  });

  it("clamps polar latitudes to what the map can show", () => {
    expect(parseCoordinates("90, 0")?.lat).toBe(85);
  });
});
