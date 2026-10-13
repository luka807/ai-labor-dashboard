# Design spec: AI Exposure, Distress & Industry dashboard

This document describes the dashboard **as it exists today** (`index.html`, `src/styles.css`, `src/app.js`). It is a factual inventory of every screen element, the data behind it, and every interaction, intended as the brief for a redesign. Where current behavior has a quirk or gap, it is noted under "Current behavior notes" so the designer can decide whether to keep it.

---

## 1. Product overview

- **What it is:** an internal Leadership Now research tool for AI tax policy work. A county-level map of the United States comparing three datasets.
- **Core question it answers:** Which U.S. counties are both highly exposed to generative AI and already economically distressed, and what industries are those jobs in?
- **Audience:** internal policy staff. Analytical, desktop-first, but must work on a phone.
- **Pages:** **one.** There is a single page with no routing, no URL state and no other screens. All "tabs" are in-page toggles (see §4).
- **Tech constraints worth knowing:** static HTML/CSS/JS, no build step; map drawn as SVG with d3 v7 + topojson. Map projection is pre-projected Albers USA (Alaska and Hawaii inset at lower left), fixed aspect ratio **975 × 610**.

### Data sources (all must be cited on the page)

| Measure | Source | Granularity |
|---|---|---|
| Generative AI exposure share (exposed jobs ÷ total jobs), exposed jobs, total jobs | Brookings Institution | County |
| Prime-age (25–54) employment rate, 5-level distress ranking, local labor market name | W.E. Upjohn Institute, Local Labor Market Distress Dataset | County |
| Employment by industry (14 sectors + total) | BLS Quarterly Census of Employment and Wages (QCEW), 2024 annual avg. (Connecticut 2023) | County |
| County population | Upjohn dataset | County |

### Data shape and realistic ranges (for sizing layouts)

- **3,142 counties** on the map; 3,140 have industry data.
- AI exposure share: **20.3% – 46.7%**. Tercile cut points: **29.7%** and **31.2%**.
- Prime-age employment rate: **14.2% – 95.9%**.
- Population: **74 – 10,105,722**. Total jobs per county: **0 – 4,567,586** (largest numbers ~7–8 digits with commas).
- Distress ranking counts: Fully employed 602 · Close to fully employed 388 · Marginally distressed 558 · Distressed 560 · Severely distressed 1,033 · No data 1.
- Counties that are both high-exposure and distressed (<76.5%): **412**.
- Longest county display name: "Prince of Wales-Hyder Census Area, AK" (37 chars).
- Longest local labor market name: "San Francisco-Redwood City-South San Francisco, CA" (50 chars).
- Missing data: Valdez-Cordova AK and Kalawao HI have no exposure; Loving TX has no employment rate. Shown in neutral gray.

---

## 2. Page layout

Single column, max width **1290px**, centered, page padding 24px top / 16px sides / 40px bottom, 24px gap between sections.

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER  (eyebrow · H1 · gold rule · intro paragraph)         │
├───────────────────────────────────────────┬──────────────────┤
│ MAP CARD                                  │ RIGHT RAIL 320px │
│ ┌ toolbar ──────────────────────────────┐ │ ┌ Legend panel ┐ │
│ │ [view tabs]   ···  [state▾][search][Reset]│ ├ Summary panel ┤ │
│ ├───────────────────────────────────────┤ │ ├ Industry mix  ┤ │
│ │                                       │ │ ├ Top-10 list   ┤ │
│ │           SVG county map              │ │ └──────────────┘ │
│ │        (+ floating tooltip)           │ │                  │
│ ├───────────────────────────────────────┤ │                  │
│ │ help note                             │ │                  │
│ └───────────────────────────────────────┘ │                  │
├───────────────────────────────────────────┴──────────────────┤
│ FOOTER  (Sources · Classes · Industry mix methodology)       │
└──────────────────────────────────────────────────────────────┘
```

- **Main area:** two-column grid, map column flexible (`minmax(0,1fr)`), right rail fixed **320px**, 24px gap, top-aligned.
- **Responsive:** at **≤ 900px** the grid collapses to one column; the rail stacks below the map in the same order. No other breakpoints. The toolbar wraps onto multiple lines as needed.
- The rail panels are stacked with 16px gaps. The rail does not scroll independently or stick; the whole page scrolls.

---

## 3. Components

### 3.1 Header

| Element | Content | Style |
|---|---|---|
| Eyebrow | "Internal · AI Tax Policy research" | 11px, uppercase, 0.14em tracking, muted gray |
| H1 | "Generative AI exposure vs. local labor market distress" | 26px, navy, balanced wrapping |
| Rule | decorative | 64 × 2px gold bar |
| Intro | "Each U.S. county is shaded by two measures at once: the share of jobs exposed to generative AI (Brookings) and the prime-age (25–54) employment rate (W.E. Upjohn Institute). Darkest counties are both highly exposed and economically distressed. Click any county, or isolate a group, to see which industries its jobs are in (BLS)." | muted gray, max 75 characters wide |

Static; no interaction.

### 3.2 Map card

White card with 1px border. Three stacked parts: toolbar, map, help note.

#### 3.2.1 Toolbar

Left to right, wrapping:

1. **Map view tabs** (segmented control, 4 buttons): `Overlay` · `AI exposure` · `Labor distress` · `Largest industry`. Exactly one is active (navy fill, white text); default **Overlay**. See §4.1.
2. Flexible spacer (pushes the rest right).
3. **State dropdown**: "All states" + every state name alphabetically (51 entries incl. DC). See §5.4.
4. **County search**: text input with placeholder "Find a county…", backed by a native autocomplete list of all 3,142 county display names ("Autauga County, AL"). See §5.5.
5. **Reset button.** See §5.6.

All controls: 13px text, 1px border, square corners, gold focus ring.

#### 3.2.2 Map

- SVG of all U.S. counties, full card width, height from the 975:610 ratio.
- **County fills** change with the active view (§4.1). Thin white county borders (0.25px), white state borders (1px) and nation outline drawn on top. Strokes stay hairline at any zoom.
- **Dimmed counties:** when a legend group is isolated, non-matching counties drop to 12% opacity.
- **Hover outline:** 1.5px near-black outline on the county under the pointer (and on the pinned county, §5.2).
- **Striped hatch overlay** (Largest industry view only): white diagonal stripes over counties whose largest sector is uncertain.
- **No-data counties:** fill `#C9C9C4` gray.
- Zoom range 1×–40×; panning is constrained to the map bounds.

#### 3.2.3 Tooltip (on hover)

Floating white card, 280px wide, 1px border, soft drop shadow, follows the pointer (offset 14px; flips left/up to stay inside the map card). Contents, top to bottom:

| Row | Value |
|---|---|
| **County name** (bold title) | e.g. "Autauga County, AL" |
| AI exposure share | % with 1 decimal, or "n/a" |
| Exposed jobs | "12,345 of 45,678" |
| Prime-age employment | % with 1 decimal |
| Distress ranking | one of the 5 Upjohn categories |
| Population | comma number |
| Government share of jobs | % (only if BLS data exists) |
| Largest sector | "Sector name (xx.x%)" + optional muted line "Uncertain: withheld jobs could change this" |
| Footer (muted, 12px) | In Overlay view only: color swatch + "Distressed · High exposure"; always: "Labor market: {Upjohn local labor market name}" |

Label/value rows are two-column, labels muted, values right-aligned with tabular figures. Not shown for counties with no data at all.

#### 3.2.4 Help note

Muted 12px strip under the map: "Scroll or pinch to zoom, drag to pan. Click a legend square to isolate that group. Click a county to see its industry mix."

### 3.3 Right rail panels

All panels: white, 1px border, 16px padding. Panel titles 13px uppercase navy with 0.08em tracking; subtitles 12px muted.

#### 3.3.1 Legend panel

Content depends entirely on the active map view. See §4.1 for each variant. It is also the control for **isolating a group** (§5.1).

#### 3.3.2 Selection summary panel

- Title: "SELECTION SUMMARY".
- Subtitle describes the current filter: "All counties", or the isolated group (e.g. "Distressed labor market · High AI exposure", "Severely distressed", "Largest industry: Manufacturing"), with " · {State}" appended when a state is chosen.
- Two-column stat list (label muted left, value right, tabular figures):

| Stat | Calculation |
|---|---|
| Counties | count of counties in current group + state |
| Population | sum |
| Total jobs | sum |
| AI-exposed jobs | sum |
| Exposure share (job-weighted) | exposed jobs ÷ total jobs |
| Correlation, exposure vs. employment rate | Pearson r, shown as "r = 0.00" (2 decimals). **Only shown when no group is isolated.** |

Does **not** change when a single county is clicked/pinned.

#### 3.3.3 Industry mix panel

The richest component. Shows the share of jobs in each sector for either the current group/state or a single pinned county, compared with the U.S.

- **Header row:** title "INDUSTRY MIX OF LOCAL JOBS" on the left; on the right a small 2-button segmented toggle **`All jobs` | `Avg. county`** (§4.2). The toggle is **hidden** while a county is pinned.
- **Pinned banner** (only when a county is pinned): pale gold strip (`#FFF4DE`) with the **county name in bold** and a small button **"Show selection"** that unpins.
- **Subtitle:**
  - Group mode: "{summary subtitle}: {n} counties, {jobs} jobs. Click a county on the map to see it alone."
  - Pinned mode: "{jobs} jobs located in the county, 2024."
- **Sector rows**, grouped under two small uppercase group labels:
  - "GOVERNMENT · {combined %}": Federal government (civilian) · State government · Local government (incl. public schools)
  - "PRIVATE EMPLOYERS": Agriculture, forestry & mining · Construction · Manufacturing · Trade, transportation & utilities · Information · Finance, insurance & real estate · Professional & business services · Private education & health care · Leisure & hospitality · Other services · Not disclosed by BLS
- **Each row:** label left; value right as "**12.3%** <small muted>U.S. 10.1%</small>"; under it a full-width 8px bar:
  - gray track `#EDEDEA`;
  - filled bar = this selection's share (navy; **government rows use a lighter blue `#4F6A98`**; "Not disclosed" uses gray `#C9C9C4`);
  - a 2px dark-orange **tick mark `#B26A00`** at the U.S. value (no tick on "Not disclosed").
  - Bars are scaled to the largest value among both the selection and the U.S. so ticks and bars share a scale.
  - Hover title: "{Sector}: x% here vs. y% U.S."
  - "Not disclosed" row is omitted when < 0.05%.
- **Key** below: navy swatch "This selection" · orange tick "U.S. overall" (label switches to "Average U.S. county" in Avg. county mode).
- **Empty state:** "No BLS employment data for this area."

#### 3.3.4 "Most exposed jobs in distressed counties" panel

- Title: "MOST EXPOSED JOBS IN DISTRESSED COUNTIES".
- Subtitle: "High-exposure tercile and prime-age employment below 76.5%, ranked by number of AI-exposed jobs. Click to locate."
- **Ordered list, top 10** counties meeting both conditions, ranked by AI-exposed job count. Each item: "{County, ST} <muted>{exposed jobs} jobs · {exposure %} · emp. {employment %}</muted>". Underline on hover.
- Respects the **state filter only** (not the view or isolated group).
- Empty state (state with none): "None in this state."
- Click → focus that county (§5.3).

### 3.4 Footer

Muted 12px text, max ~90 characters wide, three paragraphs with bold lead-ins:

- **Sources.** Brookings exposure definition; Upjohn employment rate and distress ranking.
- **Classes.** Tercile cut points (filled in live: "low < 29.7%, high ≥ 31.2%"), the 3-way distress thresholds and how they map to Upjohn's 5 categories; the three missing-data counties shown in gray.
- **Industry mix.** QCEW methodology: jobs counted by workplace, Connecticut 2023 caveat, government grouped by level (public teachers/hospitals count as government), active-duty military excluded, "Not disclosed" explanation, All jobs vs. Avg. county definitions, meaning of the stripes on the Largest industry map.

---

## 4. Tabs / toggles

There are two tab-like controls. Neither changes the page or URL.

### 4.1 Map view tabs (toolbar)

Switching views recolors the map, swaps the legend panel, and **clears any isolated group**. It does not change zoom, state filter or pinned county.

#### Overlay (default): bivariate 3×3

- Each county is placed in a 3×3 grid: **AI exposure tercile** (Low / Mid / High) × **distress class** (Healthy ≥ 80% / Marginal 76.5–80% / Distressed < 76.5%).
- Palette: exposure runs toward **gold**, distress toward **navy**, both together → dark brown.

| | Low exposure | Mid | High |
|---|---|---|---|
| **Distressed** | `#5E79A6` | `#68667A` | `#4A3B2C` |
| **Marginal** | `#AFBBD0` | `#B9A887` | `#B98935` |
| **Healthy** | `#E8E6E1` | `#F2D59A` | `#F2B33D` |

- **Legend:** title "LEGEND", subtitle "Numbers are county counts. Click a square to isolate it." A 3×3 grid of square buttons (2px gaps) with the **county count printed in each cell** (white text on the 4 dark cells, dark text otherwise). Distressed row on top. Rotated y-axis label "Labor distress →" on the left; column ticks "Low / Mid / High" and x-axis title "AI exposure share →" below.
- **Isolatable:** yes, one cell at a time.

#### AI exposure: continuous

- Sequential ramp from `#F6EEDB` (pale cream) to `#B26A00` (dark orange) over **27% → 36%**, clamped at both ends.
- **Legend:** title "AI EXPOSURE SHARE", subtitle "Share of county jobs exposed to generative AI.", a 12px-tall gradient bar with labels "≤27%", "31.5%", "≥36%".
- **Isolatable:** no. The legend has no clickable parts.

#### Labor distress: 5 categories

- Upjohn's own 5-level ranking in a navy ramp: Fully employed `#DDE3EC` · Close to fully employed `#AFBBD0` · Marginally distressed `#8297BB` · Distressed `#4F6A98` · Severely distressed `#1E3A65`.
- **Legend:** title "LABOR DISTRESS", subtitle "Prime-age employment rate ranking. Click to isolate." Five rows: 16px color square button + category name + county count right-aligned. Footnote: "Thresholds: ≥82.8%, 80–82.8%, 76.5–80%, 72.3–76.5%, <72.3%."
- **Isolatable:** yes, one category.

#### Largest industry: categorical + hatch

- Each county colored by the sector with the most jobs (Government = federal + state + local combined, vs. 10 private supersectors). Only the 6 most common winners get their own color; the rest fold into "Other":

| Category | Color |
|---|---|
| Government | `#1E3A65` navy |
| Trade, transportation & utilities | `#5BC0BE` teal |
| Manufacturing | `#9085E9` lavender |
| Private education & health care | `#B5179E` magenta |
| Leisure & hospitality | `#EDA100` amber |
| Agriculture, forestry & mining | `#008300` green |
| Other (sub-label: "Professional services, construction, finance, information, other services") | `#8E8D86` gray |

- **Uncertainty hatch:** if the jobs BLS withheld exceed the lead of the #1 sector over #2, the county gets white 45° stripes over its color.
- **Legend:** title "LARGEST INDUSTRY", subtitle "Sector with the most jobs located in the county (BLS, 2024). Government combines federal, state and local. Click to isolate." Seven rows: color square button + name (+ muted sub-label for Other) + county count. Final non-clickable row: striped swatch + "Striped: BLS withheld enough jobs that a different sector could be largest" + count.
- **Isolatable:** yes, one category. When isolated, only that category's uncertain counties keep their stripes.

### 4.2 Industry weighting toggle (Industry mix panel)

`All jobs` (default) | `Avg. county`

- **All jobs:** pools every job in the selection, so big counties dominate. U.S. comparison = all U.S. jobs ("U.S. overall").
- **Avg. county:** computes each county's mix, then averages them equally. U.S. comparison = the average U.S. county ("Average U.S. county").
- Only affects the Industry mix panel. Hidden while a single county is pinned (a single county has only one mix; it is compared with "U.S. overall").

---

## 5. Interactions

### 5.1 Isolate a group (legend click)

- Available in Overlay, Labor distress and Largest industry views.
- Click a legend square → counties outside that group dim to 12%; non-selected legend squares fade to 20% opacity.
- Click the same square again → clears the isolation. Clicking a different square switches to it.
- Updates: map dimming, hatch (Largest industry), Selection summary (subtitle + stats; correlation row hidden), Industry mix (unless a county is pinned).
- Cleared by: switching map view, or Reset.

### 5.2 Hover and click a county

- **Hover:** outline + tooltip (§3.2.3). Leaving the county hides the tooltip; the outline returns to the pinned county if there is one.
- **Click:** **pins** that county. Its outline stays; the Industry mix panel switches to that county alone with the pinned banner. Clicking another county re-pins. Unpin with "Show selection" or Reset.
- Click does not zoom and does not change the Selection summary.

### 5.3 Focus a county (from search or the Top-10 list)

1. Animated zoom (650ms) to fit the county at ~90% of the map.
2. Pin it (as in 5.2).
3. After the zoom finishes, show its tooltip anchored at the county's center.

Animations are instant when the OS "reduce motion" setting is on.

### 5.4 State dropdown

- Choosing a state zooms the map to that state and **filters** the Selection summary, the Industry mix (group mode) and the Top-10 list to that state.
- Counties outside the state are **not** dimmed; they just fall outside the zoomed view.
- "All states" zooms back out and removes the filter.

### 5.5 County search

Native text field with browser autocomplete of all county names. When the value exactly matches a county name (picking from the list), it focuses that county (§5.3). Partial or misspelled text does nothing; there's no "no results" message.

### 5.6 Reset

Clears: isolated group, state filter (dropdown back to "All states"), search text, pinned county, outline, tooltip; animates zoom back to full U.S.
Does **not** reset: the active map view tab or the All jobs / Avg. county toggle.

### 5.7 Pan and zoom

Mouse wheel / trackpad pinch / touch pinch to zoom (1×–40×); drag to pan. No on-screen zoom buttons.

### 5.8 Keyboard and accessibility (current)

- All buttons, the dropdown and the search field are keyboard-reachable, with a 2px gold focus ring.
- View tabs and the weighting toggle use `aria-pressed`. Legend squares have descriptive `aria-label`s (e.g. "Distressed labor market, High AI exposure: 412 counties").
- The map is one `role="img"` SVG; **individual counties are not keyboard focusable** and the tooltip is pointer-only. Top-10 list items are clickable `<li>`s, not buttons (not keyboard-activatable).

---

## 6. State model summary

| State | Values | Set by | Affects |
|---|---|---|---|
| View | Overlay / AI exposure / Labor distress / Largest industry | View tabs | Map colors, legend, hatch, tooltip swatch |
| Isolated group | none or one legend item | Legend click | Dimming, summary, industry mix |
| State filter | none or one state | Dropdown | Zoom, summary, industry mix, top-10 |
| Pinned county | none or one county | Map click, search, top-10 | Outline, industry mix |
| Weighting | All jobs / Avg. county | Industry toggle | Industry mix only |
| Zoom/pan | transform | Wheel, drag, focus, state, reset | Map viewport |

Nothing is persisted; a reload returns to defaults.

---

## 7. Visual system (current)

Leadership Now brand, internal register. Light theme only.

| Token | Value | Use |
|---|---|---|
| Background | `#F5F5F5` | page |
| Surface | `#FFFFFF` | cards, panels, tooltip |
| Text | `#212121` | body |
| Muted | `#595A55` | labels, captions, footer |
| Line | `#D9D9D4` | borders, dividers |
| Navy | `#1E3A65` | headings, active tabs, bars |
| Gold | `#FFB638` | header rule, focus ring (fills and rules only, **never text**) |
| Gov bar | `#4F6A98` | government bars |
| U.S. tick | `#B26A00` | comparison tick |
| Bar track | `#EDEDEA` | bar backgrounds |
| No data | `#C9C9C4` | gray counties, "Not disclosed" bar |
| Pinned banner | `#FFF4DE` | pinned county strip |

- **Type:** Helvetica Neue / Helvetica / Arial. Body 15px/1.5; controls 13px; panel text 12–13px; captions 11–12px. Numbers use tabular figures.
- **Shape:** square corners everywhere (no border radius), 1px borders, the tooltip is the only shadowed element.
- **Copy rules:** write "Leadership Now", never "LNP", in visible copy. Every data source must be cited on the page.

---

## 8. Current behavior notes (gaps a redesign may address)

- The AI exposure view has no isolation, unlike the other three views.
- Pinning a county persists across view changes and legend isolation, so the Industry mix can keep showing one county while the map shows a group; the user must press "Show selection".
- The Top-10 list ignores the active view and isolated group; it only follows the state filter.
- The State filter narrows the panels but doesn't visually de-emphasize other states on the map.
- Reset doesn't restore the default view tab or weighting.
- No URL/shareable state, no export or download, no print layout.
- Mobile: the map gets small at phone width (fixed 975:610 ratio), and hover tooltips don't really work on touch (tap pins the county but the tooltip depends on pointer movement).
