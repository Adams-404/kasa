import { afterEach, describe, expect, it } from "vitest";
import { fetchPowerSeries } from "./api/power";
import { clearCache } from "./cache";
import { seedDemoPack } from "./demoPack";

describe("offline demo pack", () => {
  afterEach(() => {
    clearCache();
  });

  it("serves the 10-year and 40-year windows without a network request", async () => {
    seedDemoPack();

    const short = await fetchPowerSeries(10.29, 11.17, 2016, 2025);
    const long = await fetchPowerSeries(10.29, 11.17, 1986, 2025);

    expect(short.series.T2M).toHaveLength(120);
    expect(long.series.T2M).toHaveLength(480);
    expect(short.series.PRECTOTCORR).toHaveLength(120);
  });
});
