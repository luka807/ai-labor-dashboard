# ai-labor-dashboard

County-level map of the U.S. comparing generative AI exposure (Brookings), local labor market distress (W.E. Upjohn Institute) and industry mix (BLS QCEW). Internal research tool for Leadership Now's AI tax policy work.

## Map views

| View | What it shows |
|---|---|
| **Exposure × distress** | Bivariate map: AI exposure terciles crossed with three distress groups (healthy / marginal / distressed), on a 3×3 legend. |
| **Exposure × industry** | Counties shaded by AI exposure tercile. The legend is a matrix of each county's largest industry (7 groups) by exposure tercile, with county counts and each industry's share of high-exposure counties. Click a square, an industry name or an exposure column to isolate it. |
| **AI exposure** | Continuous exposure share. |
| **Labor distress** | Upjohn's five distress levels, based on the prime-age (25–54) employment rate. |
| **Largest industry** | Sector with the most jobs in each county; government combines federal, state and local. |

In every view you can filter by state, search for a county, and click a county to see its industry mix. On Largest industry, and on Exposure × industry once a group is isolated, striped counties are ones where jobs BLS withheld could change which sector is largest.

## Run it

No build step. Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

See `CLAUDE.md` for file layout, data schemas and classification rules.
