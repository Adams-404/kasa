# Official challenge brief

**Challenge:** Be An Earth System Trend Detective!
**Page:** https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
**Event:** 2026 NASA Space Apps Challenge, 14-15 Nov 2026
**Difficulty:** Advanced. **Subjects:** Earth Science, Software.

> The URL in `project.md` was never written down, but the slug I first guessed
> (`be-an-earth-system-trend-detective`) 404s. The real slug is
> **`earth-system-trend-detective`**. Use the link above.

## What the brief actually asks for

Verbatim challenge statement:

> Your challenge is to create a tool that can select variables measured by Earth science
> missions or produced by Earth science models, visualize how they change over time, and
> determine what is changing, where it is changing, how much it is changing, and if these
> changes are what scientists call "significant."

The Objectives section names four required elements:

1. **Identify** Earth science variables that can be investigated for trends.
2. **Acquire** those variables for a particular region (most trends are not global).
3. **Generate and visualize** a time series for that variable and region "over a long
   enough period of time to allow statistical analysis".
4. **Perform a basic statistical analysis** of that time series giving "the rate of change
   over time", and "test the trend's significance using methods such as a t-test, the
   Mann-Kendall test, or confidence intervals".

And: "A response that does both the visualization and the analysis meets the full scope of
this challenge." That is exactly our Phase 3.

## Details that shape our build

- **Seasonality matters, officially.** The brief says trends "are not evident unless
  regular cycles, such as the seasonal cycle, are removed". Our anomaly step is required,
  not decorative.
- **Linear trends are explicitly enough.** "More complex trend analyses are beyond the
  scope envisioned for this challenge; detecting and analyzing linear trends would be a
  great start." Mann-Kendall + Theil-Sen is comfortably inside scope.
- **A non-significant trend is still a valid result.** "Finding a trend is interesting even
  if it doesn't reach the level of significance." Our verdict copy must be able to say
  "no significant trend" without treating it as a failure.
- **Audience is stated:** high school and college students, plus members of the public with
  some science background. "Providing simple definitions of the variables would help these
  users considerably." → we owe a one-line plain definition for every variable we expose.
- **Demo examples are suggested:** "It would be highly useful to provide a couple of
  demonstration examples." Our demo pack (Gombe, Lake Chad, one non-African place) covers
  this.
- **Temporal resolution:** daily and monthly are "likely the easiest to process" — our
  monthly POWER choice is aligned.

## Resources listed on the page (Resources tab)

NASA:
- Giovanni — https://giovanni.gsfc.nasa.gov/ (variable menus, time series, download)
- GES DISC Hydrology Time Series — https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series
- AppEEARS — https://appeears.earthdatacloud.nasa.gov/ (geospatial subsetting, time series)
- NOAA Climate Data Online — https://www.ncei.noaa.gov/cdo-web/
- NTRS paper: *Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in
  River-Influenced Coastal Regions* — https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf

Partner / other:
- KNMI Climate Explorer — https://climexp.knmi.nl/
- *Statistical test methods to detect trends in time series data* (Medium)
- *A Comprehensive Guide to Statistical Significance* (Statsig)
- CSA RADARSAT Constellation Mission data, Geo.ca, CSA SWOT

**Why we still use POWER:** Giovanni, AppEEARS and GES DISC need an Earthdata Login
account for programmatic access. POWER needs no key, returns point time series back to
1981, and is NASA's own MERRA-2 based product. It is a legitimate NASA Earth model data
source under the brief ("produced by Earth science models"). Note this choice in the
README and submission text so judges see the reasoning.

## Where `project.md` differed (all corrected in `project.md`)

| `project.md` said | Verified reality |
|---|---|
| Challenge page slug implied `/be-an-earth-system-trend-detective/` | Real slug is `/earth-system-trend-detective/` |
| GIBS tile pattern `{layer}/default/{date}/{TMS}/{z}/{y}/{x}.jpg` | Correct, but `{TMS}` is per-layer. True Color is `GoogleMapsCompatible_Level9`, Blue Marble is `GoogleMapsCompatible_Level8` |
| "Optional: root zone soil wetness (check it is available)" | `GWETROOT` exists in POWER; still optional, see `02-data-sources.md` |
| Implied a single imagery layer | MODIS Terra true color starts 2000-02-24; VIIRS SNPP starts 2015-11-24 and has gaps. We need a fallback chain |
| Nominatim "send a proper app identifier" | Also: **autocomplete is explicitly banned**, and apps should proxy + cache |
