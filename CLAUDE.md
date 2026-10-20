# AI Exposure, Distress & Industry — dashboard

Internal research tool for Leadership Now Project's AI tax policy work. A county-level map of the U.S. comparing:

- **Generative AI exposure**: Brookings Institution, share of county jobs exposed to generative AI.
- **Labor market distress**: W.E. Upjohn Institute for Employment Research, Local Labor Market Distress Dataset (prime-age 25–54 employment rate).
- **Industry mix**: BLS Quarterly Census of Employment and Wages (QCEW), 2024 annual average employment by county (Connecticut uses 2023).

This project was split out of a single-file Claude artifact ("AI Exposure, Distress & Industry") so it can be extended into a fuller dashboard. It has since added the Exposure × industry view and multi-group legend selection.

## Run it

No build step. Open `index.html` in a browser, or serve the folder (`python3 -m http.server`). Data is loaded as plain `<script>` files that set globals, so it also works from `file://`.

## Layout

```
index.html                 markup + script tags
src/styles.css             all styles (brand tokens on :root)
src/app.js                 all logic (d3 v7 + topojson-client, from cdnjs)
data/counties-topo.js      window.TOPO  — us-atlas@3 counties-albers-10m (pre-projected, viewBox 975×610)
data/county-data.js        window.DATA  — {q:[tercile1, tercile2], rows:{FIPS: [...]}}
data/county-industry.js    window.IND   — {FIPS: [15 numbers]}
source-data/               raw Brookings CSV and Upjohn XLSX (the BLS extract is not included)
```

The `data/*.js` files are single very long lines (~200–800 KB). Don't open them whole; inspect with `head -c` or load them in Node/Python.

## Data schemas

`DATA.rows[fips]` (5-digit string FIPS, 3,142 counties, matches topojson ids exactly):

| idx | field |
|---|---|
| 0 | display name, e.g. "Autauga County, AL" |
| 1 | state name |
| 2 | exposure_share (Brookings), null for Valdez-Cordova AK, Kalawao HI |
| 3 | total_exposed_jobs |
| 4 | total_jobs |
| 5 | county prime-age employment rate (Upjohn), null for Loving TX |
| 6 | Upjohn DistressRanking (5 categories) |
| 7 | county total population |
| 8 | Upjohn local labor market (SLLM) name |

`DATA.q` = exposure tercile cut points across counties (~29.7%, ~31.2%).

`IND[fips]` = `[fed, st, lcl, nat, con, mfg, ttu, inf, fin, pbs, eh, lh, oth, nd, total]`, i.e. federal civilian / state / local government, then private supersectors, `nd` = jobs BLS withheld ("Not disclosed"), `total`.

## Classification rules (keep consistent)

- Exposure: county terciles (low / mid / high).
- Distress (3-way, used in the Exposure × distress view): healthy ≥ 80%, marginal 76.5–80%, distressed < 76.5%, matching Upjohn's own thresholds.
- Upjohn 5-way thresholds: ≥ 82.8% fully employed, 80–82.8% close, 76.5–80% marginal, 72.3–76.5% distressed, < 72.3% severely distressed.
- Largest industry: government (fed + state + local) vs. 10 private supersectors, folded into 7 display groups (`LCAT`; small sectors go to "Other"). A county is striped when withheld jobs exceed the gap between its top two sectors.
- Exposure × industry: fill is the exposure tercile only (gold ramp `XI`); industry is read from the legend matrix (`LCAT` rows × terciles). Don't color it by industry hue × exposure lightness: 21 colors on a choropleth can't be told apart. Stripes show only once a group is isolated.

## Map views

Tab order and `view` keys in `src/app.js`: Exposure × distress (`bi`), Exposure × industry (`xi`), AI exposure (`ex`), Labor distress (`ds`), Largest industry (`gv`). Each view has a branch in `fill`, `selKey`, `legend` and `selLabel`; a new view needs all four plus a button in `index.html` and an entry in the view-toggle list. Legend selection keys: `bi` = `"distress-exposure"`, `xi` = `"<LCAT key>|<tercile>"`, `ds` = Upjohn category name, `gv` = `LCAT` key.

## Rebuilding data

`DATA` was built by joining `source-data/brookings_genai_exposure_by_county.csv` (FIPS) to the `County` sheet of the Upjohn XLSX (`CountyFIPS`) in pandas. If you add new county-level measures, join on zero-padded 5-digit FIPS and keep the same county universe (us-atlas@3, which uses pre-2022 Connecticut counties and Valdez-Cordova 02261).

## Style

Leadership Now brand, internal register: navy `#1E3A65`, gold `#FFB638` (as fills and rules, never as text), near-black `#212121`, off-white `#F5F5F5`, squared corners (no border-radius), Helvetica/Arial stack. Light theme only. Write "Leadership Now", never "LNP", in any visible copy. Cite every source on the page.
