# Raynor Realty Bottom Line

Raynor Realty Bottom Line (formerly the Package Margin Planner) is the internal tool for Raynor Realty's three management packages (Minimum, Raynor Special, Protection Plus). It shows each package's revenue, cost and margin from the full cost model. Published as a claude.ai artifact:

- **Bottom Line:** https://claude.ai/artifact/TonYb72K2VP3zghjfr3FrS
- **Owner packages** (owner-facing, no costs or margins): https://claude.ai/artifact/XdFLzczk6Eoggnot8Qv2eX. Source `owner-packages-src.html`; build with `node build-owner.js`, which inlines the logo into `owner-packages.html`. Its prices, tier differences and fee-choice math are copied from the official numbers by hand, so update it when those change.
- The earlier Workbench, Sheet and Margin Ledger artifacts were deleted on 2026-10-05; their source stays here for reference.

## Files

| File | What it is |
|---|---|
| `workbench-engine.js` | All the math: cost model (ported from `lib/calc.ts`), pricing and owner fee choice, fees and add-ons, growth, acquisitions. Shared by every version. |
| `planner-ui.js`, `planner-shell.html` | The Planner's interface and styles. |
| `build-workbench.js` | Inlines engine + UI + seed data into one HTML page. |
| `preview-server.js` | Local preview on port 8940 (`workbench` in `.claude/launch.json`). |
| `workbench-ui.js`, `workbench-shell.html`, `sheet-*`, `assemble-sheet.js` | Retired versions, kept for reference. |

## Build and publish

```
cd workbench
node build-workbench.js ../data/seed-model.json planner-shell.html planner-ui.js package-margin-planner.html
```

Then publish `package-margin-planner.html` with the Artifact tool, passing the Planner URL as `url`. Omit `capabilities` so the stored ones carry forward: `db` with rule `official: read view, write owner`, plus `user` with scope `profile`.

## Saved data

Scenarios live in the artifact's claude.ai database, never in this repo, and republishing never touches them:

- `data/users/<id>/<scenario>`: private, visible only to that person
- `shared/<scenario>`: everyone with access; only the creator edits
- `official/default`: the official numbers; only the artifact owner writes

Every loaded scenario goes through `normalizeDoc`, which migrates older data forward. When the data shape changes, add a migration there instead of breaking old scenarios.

### What a scenario (doc) holds beyond the cost model

| Field | What it is |
|---|---|
| `seats[id]` | A per-seat cost line's own seat count. Missing means it uses `G.seats`. Set in the line's details. |
| `addons[]` | Per-use fees, optional add-ons and owner benefits packages. Add-on fields: `price`, `cost`, `freq` + `per` (how often: `door_yr`, `turnover`, `month`, `portfolio_yr`), `uptake` (% of owners who buy), `tiers` (charged / included / off per tier). |
| `addons[].svc` | Set on an add-on sold from a service or cost line ("Also sell as an add-on" in its details). Its tiers follow that line's checkboxes: a tier that includes it doesn't sell it (`syncLinked`). Its cost follows the line (`linkedAddonCost`) unless `costOwn` is true. |
| `resident` | Resident revenue: `on` (counted in revenue or not), `rbp[]` (packages with `fmv` and `fee`), `raynorPct`, `renewalFee` (per renewal), `adminFee` (per move-in), `petYr`/`petKeep`, `lateYr`/`lateKeep`, `appYr`. |
| `G.vacantDays`, `pricing.vacancyFee`, `pricing.tiers[t].vacancyCharge` | Days a unit sits empty per turnover, the flat fee owners pay then, and which tiers charge it. |
| `cmp` | The scenarios picked on Compare (`current`, `official`, `p:<id>`, `s:<id>`). |
| `growth` | The door counts shown on Growth. |
| `acq[]` | Acquisition deals. The page opens on the Quick snapshot (no deal money, safe to show a seller); Full analysis has price, payback and what the book earns. |
| `MASTER[id]` with `place[id] = "uc"` | A bench idea (Services page). Add, rename, recategorize and remove them in the details panel. |

An owner who buys the eviction guarantee add-on isn't billed the $750 for evictions of tenants Raynor placed (`billedEvictionsYr`).

## Testing locally

Use the `workbench` preview server (port 8940). Saving only works on claude.ai, so to test scenarios, Compare or anything that reads the official numbers, make a throwaway copy of the built page with a stand-in `window.claude` at the top. The stand-in's `use("db")` serves a copy of `official/default` and a shared scenario; `use("user")` returns an owner. Delete the copy afterwards and never publish it. Check layouts with a screenshot using realistic data, including tiers a scenario doesn't sell.

## Business rules (confirmed with the owner)

- The eviction guarantee is in Raynor Special and Protection Plus (confirmed 2026-10-05), and only for tenants Raynor placed.
- Evictions are billed at $750: court fees ($96 + $30/tenant) come out first, and the rest splits 50/50 with the PM. A guaranteed eviction costs Raynor court fees only, with no PM pay (their time is salaried). The $1,500 attorney cap is almost never used.
- Each guarantee lives in one place. The Eviction guarantee checkbox and the Eviction service checkbox stay in sync, and billed evictions follow both.
- Lease break waiver = the tier's actual leasing fee, waived on re-placement (Special and Plus).
- Special coordination ($150) replaces the $75 fee; it isn't added on top.
- Per-use fees live on the Services page. Prices stays focused on finding the price.
- 180 long-term residential doors are the package doors (`G.doors`). STR (`G.str`) and commercial (`G.comm`) units only share costs: staff, flat and per-unit software and overhead are spread over all units. Turnovers, listings, guarantees, leases and evictions stay on the residential doors. STR and commercial income is kept in the engine but not shown.
- Work orders are residential only (confirmed 2026-10-09). By default they follow doors (`G.woByDoor`, `G.woPerDoor` per door a year); off, `G.wo` is a fixed count. Read them with `woYr(doc)`. Coordination fees are billed only on residential units and spread over the package doors.
- AppFolio residential units = doors + STR when "Include STR" is on; commercial is billed separately when "Include commercial" is on.
- Any service or cost line a tier leaves out can be sold to that tier as an add-on. Vacancy-related ones are billed per turnover. Guarantees are billed per door per month, at a cost equal to their expected claims.
- Margins are the RPU of a filled unit. The vacancy fee ($99/mo while vacant: charged on Minimum and Special, included in Plus) is a package benefit to compare. "Count vacancy in margin" (off by default) stops the % fee for the vacant days and bills the vacancy fee instead. There is no monthly minimum: the owner's fee choice moves the leasing fee instead.
- Resident revenue (confirmed 2026-10-09) is the same in every package and can be switched off to see owner-paid revenue alone. RBP = the plain average spread of all 9 packages (every unit has one). Tenant renewal fee = $ per renewal ($50–250) × renewals, started where it matches last year's $100/door. Admin fee $195 × move-ins a year (`G.moveIns`, Portfolio → Yearly activity; starts at doors ÷ tenancy). Pet rent $89 and late fees $58 per door a year, with a % Raynor keeps (100% today; they fund the pet and eviction guarantees). Application fees $2.50 per door a year. It only comes from tenants Raynor placed or renewed, so an acquired book ramps in over its first lease term.
- The owner accounting fee ($125/door/yr) is billed on Minimum (required) and included in Special and Plus. It replaced the "Annual accounting / tax docs" service, which was removed (v8).
- Left out on purpose (kept in the "Ideas parked for later" doc): brokerage income, commissions, in-person showings, tenant-placement-only, the old add-on catalog prices. The target margin is 20% for now. Rent-loss is $0 for now. Guarantees count from Fully Allocated (moved from Loaded 2026-10-12: they are a cost of the packages that include them). Executive pay stays at Fully Loaded.
- Scope-service values are PM capacity freed when a tier strips a service, not added cost.
- Owner preferences: a question isn't a change request; ask before changing any calculation; plain English; laptop screen.
- Inputs: every number shows its unit after it ($ in front for money, plus what it's per: /mo, /door/yr, /move-in; counts say what they count: doors, units, seats).
- Look: blue backgrounds, light-blue accents, gold from the logo. Keep tables calm and keep editing in the side details panel, not extra table columns. When asked to fix a page, change as little as possible and keep its look; if the ask is vague, show a mockup first.
