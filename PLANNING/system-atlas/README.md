# NOREX Living System Atlas

> Automatically regenerated from the repository. This is a **static evidence map**, not a complete runtime trace.

Source revision: `0b303c2dfc87756c22eb0b729521b4ded1dc45be`

Indexed **665 files**, **427 resolved module imports**, **224 API path literals**, **273 SQL table references**.

## Navigate

- [Interactive Explorer](explorer.html) (serve this directory over HTTP)
- [System layers](00-system-layers.md)
- [API references](map-api.md)
- [Database references](map-database.md)
- [.github dependency graph](layer-github.md)
- [bot dependency graph](layer-bot.md)
- [config.json dependency graph](layer-config.json.md)
- [data dependency graph](layer-data.md)
- [package.json dependency graph](layer-package.json.md)
- [scripts dependency graph](layer-scripts.md)
- [tests dependency graph](layer-tests.md)
- [web dependency graph](layer-web.md)

## Evidence and limits

- Every node is tied to a repository path; inspect `inventory.json` for functions, endpoints, tables and dependencies.
- Imports are statically resolved; dynamic imports, data-dependent dispatch, indirect queries and generated code may be absent.
- SQL references are extracted from source, not from live database schemas or execution traces.
- This index does not claim that a function executes, a formula is correct, or a production integration is healthy.
- For business rules and calculations, use the indexed function names as entry points for deeper traced process diagrams.

## Refresh

Run `python3 scripts/build-system-atlas.py` locally, or let the GitHub Actions atlas workflow update on changes.
