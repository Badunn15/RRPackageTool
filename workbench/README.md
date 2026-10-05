# Raynor Realty Bottom Line

Raynor Realty Bottom Line (formerly the Package Margin Planner) is the internal tool for Raynor Realty's three management packages (Minimum, Raynor Special, Protection Plus). It shows each package's revenue, cost and margin from the full cost model. Published as a claude.ai artifact:

- **Planner (the one to use):** https://claude.ai/artifact/TonYb72K2VP3zghjfr3FrS
- Retired earlier versions, same math, no cloud saving: Workbench (https://claude.ai/artifact/34G3F1isF5dAdB5jv68AQR), Sheet (https://claude.ai/artifact/GcHJRHVejJoWxR6C4e8Vtz)

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

## Business rules (confirmed with the owner)

- Only Protection Plus has the eviction guarantee, and only for tenants Raynor placed.
- Evictions are billed at $750: court fees ($96 + $30/tenant) come out first, and the rest splits 50/50 with the PM. A guaranteed eviction costs Raynor court fees only, with no PM pay (their time is salaried). The $1,500 attorney cap is almost never used.
- Each guarantee lives in one place. The Eviction guarantee checkbox and the Eviction service checkbox stay in sync, and billed evictions follow both.
- Lease break waiver = the tier's actual leasing fee, waived on re-placement (Special and Plus).
- Special coordination ($150) replaces the $75 fee; it isn't added on top.
- Per-use fees live on the Services page. Prices stays focused on finding the price.
- AppFolio residential units = doors − commercial units.
- Vacancy is 0% (fees are only collected once a renter is placed). The 20% target margin is a placeholder. Rent-loss is $0 for now. Guarantees count only at Fully Loaded.
- Scope-service values are PM capacity freed when a tier strips a service, not added cost.
- Owner preferences: a question isn't a change request; ask before changing any calculation; plain English.
