# Strata: design plan

Written before any UI code, per `project.md` section 7. Reviewed against section 6 after
drafting; the review notes are at the bottom.

## The one idea

A place is a **drill core**. Time runs downward. Each year is a stratum: a band with a
thickness and a colour. The core is not a slider with a rock skin — the bands *are* the
control. Dragging across them moves the imagery date, and the same band lights up in the
chart and the ring view.

Everything else is deliberately quiet so the core and the dive stay loud.

## Tokens

### Colour

| Token | Value | Use | Contrast on Basalt |
|---|---|---|---|
| `--basalt` | `#14181D` | page ground | — |
| `--slate` | `#232A32` | slab panels | — |
| `--chalk` | `#E8E4D8` | primary text | 14.0:1 |
| `--ash` | `#8A94A0` | secondary text, axes, units | 5.8:1 |
| `--tide` | `#4FA3A5` | cool / wet / below normal | 6.0:1 |
| `--ochre` | `#D6A23A` | warm / dry / above normal | 7.7:1 |
| `--lichen` | `#9DB36B` | vegetation, positive status | 7.7:1 |
| `--madder` | `#C2483D` | **structural accent only** | 3.6:1 |

`--ash` is the one addition to the starting palette: section 6 defines text and data
colours but no muted ink, and axis labels cannot be Chalk without flattening the hierarchy.

**Madder rule (from measurement, not taste):** at 3.6:1 it fails body-text contrast, so it
never carries small text. It appears only as: a 2px strata rule, a dot marker, a focus ring
on the core, and text at 24px or larger where 3:1 applies. A "significant" verdict is Chalk
text over a Madder rule — the colour is in the structure, not in the sentence.

**Anomaly scale** (diverging, shared by core, ring view and chart):

```
-3σ ── tide deep (#2C6B6D) ── tide ── neutral (#6E7378, warm grey, not white)
                                         ── ochre ── ochre deep (#8A5F16) ── +3σ
```

Neutral is a warm grey rather than white so "no anomaly" reads as rock, not as paper. Every
coloured mark is paired with a number, and cold/warm also differ in lightness, so the scale
survives deuteranopia and greyscale printing.

### Type

- UI + headings: **Familjen Grotesk** (400, 500, 700). Real weight contrast: place names at
  700, labels at 400, never fake-bold.
- Reading (History, Culture): **Spectral** 400/600, 18px, line-height 1.65.
- Numbers: Familjen Grotesk with `font-variant-numeric: tabular-nums slashed-zero`. No mono.

Scale, used exhaustively: **13 / 15 / 18 / 24 / 36 / 56** px.
Line heights: 1.45 for 13-18, 1.2 for 24, 1.05 for 36-56.

### Space and edge

4px base unit; spacing steps 4 / 8 / 12 / 16 / 24 / 40 / 64. Reading column max 66ch.
Panels are **slabs**: square corners, one flat 1px edge in `--slate` lift, no shadow, no
radius. Separation is done with strata rules, not gaps and cards.

**Strata rule:** a horizontal hairline whose thickness means something.
- 1px `--ash` at 25% — ordinary division.
- 2px `--madder` — a year with a significant change.
- 4px `--slate` — a decade boundary in the core.

### Motion

- One orchestrated moment: the dive. ~2.2s, camera + projection + core slide, driven by one
  timeline. Under `prefers-reduced-motion`: 200ms cross-fade, no camera move.
- Everything else is instant or 120ms linear, and only on direct interaction (a core drag,
  a swipe, a panel opening). No scroll reveals, no hover lift, no stagger.

## Layout sketches

### 1. Globe screen

```
+--------------------------------------------------------------------+
|  Kasa                                                    about     |
|                                                                    |
|                                                                    |
|                    .-''''''''''-.                                 |
|                 .'     ·  ·  ·    '.        <- slow spin,          |
|                /     ·   ▁▂▃▂    \            Blue Marble,         |
|                |    ·  ▃▅███▅▃   |            thin tide limb light |
|                \      ▔▀███▀▔    /                                 |
|                 '.     ▔▀▀▔    .'                                  |
|                    '-........-'                                    |
|                                                                    |
|         +--------------------------------------+                   |
|         | Search a place or paste coordinates |   <- underline,    |
|         +--------------------------------------+      not a pill   |
|            Gombe · Lake Chad · Atacama          <- demo chips      |
+--------------------------------------------------------------------+
```

The globe is full-bleed and the only thing with colour. The search is a single rule with a
label above it. Demo places are plain text links, not buttons in boxes.

### 2. Place view, desktop

```
+--------------------------------------------------------------------+
|  <- Globe   Gombe, Nigeria        10.29 N, 11.17 E      share      |
+-----------+--------------------------------------+-----------------+
| History   |                                      |  2016 ▏▏▏       |
| Culture   |                                      |  2017 ▏▏▏▏      |
| Now       |          satellite map             |  2018 ▏▏▏       |
| Ask       |        (swipe handle later)         |  2019 ▏▏▏▏▏     |
|           |                                      |  ...            |
|  reading  |                                      |  2025 ▏▏▏▏      |
|  column   |                                      |   ↑ core        |
|  66ch     +--------------------------------------+-----------------+
|           |  Temperature  Rainfall        significant · p 0.02   |
|           |  ~~~ chart, trend line, band of p uncertainty ~~~      |
|           |  "Rose about 0.3 °C per decade, 2016-2025."           |
+-----------+--------------------------------------+-----------------+
```

The core is flush to the right edge, full height, and **wider than a slider** (56px) so it
can be grabbed. Year labels sit inside the bands at 13px. The band heights are proportional
to |anomaly|, so the core reads as a real core: some years are fat, some are a hairline.

### 3. Place view, phone

```
+----------------------------+
| <-   Gombe, Nigeria        |
+----------------------------+
|                            |
|         map                |
|                            |
+----------------------------+
| 2016 ▏ 2018 ▏ 2020 ▏ 2025  |   <- core rotates 90°, full width
+----------------------------+
| Temp | Rain |   verdict    |
|    chart, trend line       |
+----------------------------+
| History Culture Now Ask    |   <- bottom sheet, drag handle
+----------------------------+
```

## What makes this not a default dashboard

1. **Time is an object, not a control.** A core/ring/chart trio sharing one scale, where the
   core's band thickness encodes magnitude. Nothing in a dashboard template does this.
2. **No card grid.** Two slabs and a full-bleed map; division is by rules with meaning.
3. **The accent is structural.** Madder is banned from small text and used for significant
   years, so the page's colour composition literally encodes the statistics.
4. **One loud moment.** The dive, then stillness. The discipline is the design.
5. **Numbers behave like instruments:** tabular figures, fixed decimal places, units always
   present, p-values never rounded to "0".

## Review against section 6

- *Do not put everything in identical rounded cards* → no radii, no shadows, slabs + rules. ✅
- *Avoid near-black with one neon accent* → four earth tones, none neon; Madder is desaturated
  brick, not a neon. ✅
- *Avoid warm cream + serif + clay* → dark basalt ground, serif only inside reading panels. ✅
- *No all-caps tracked eyebrows, no 01/02/03* → labels are sentence case, 13px, `--ash`. ✅
- *Spend boldness in one place* → dive + core only; panels are quiet. ✅
- *Color-blind readable, always pair with number/label* → diverging scale + labels. ✅
- *Quality floor* → 44px targets (core bands 44px min on touch), visible focus (2px Madder
  offset ring), reduced motion, 66ch columns. ✅
