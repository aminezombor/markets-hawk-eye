# Markets HAWK-EYE

Markets HAWK-EYE is a static strategic dependency map for examining where critical markets are concentrated, exposed, resilient, and open to investigation.

The website contains two public surfaces:

- `/` - the interactive map across five local datasets.
- `/about` - the project methodology, data model, interpretation guide, and limitations.

## Run Locally

```bash
cd web
pnpm install
pnpm run sync-data
pnpm test
pnpm run build
pnpm run dev
```

## Map Scope

- EU AI Stack
- Global AI Stack
- Industrial Software / OT Stack
- European Defence Stack
- Global Aerospace Stack

The map distinguishes known relationships from inferred strategic hypotheses. Every inferred edge should be treated as directional intelligence, not as confirmation of a private supplier contract or commercial relationship.

Records without a valid graph edge remain visible as unconnected evidence. The interface does not invent relationships to make the graph look complete.

## Architecture

The React, Vite, and TypeScript frontend loads five versioned local JSON datasets and renders them with `react-force-graph-2d`. There is no backend, authentication layer, database, or live scraping in the deployed application.

Built by Amine Zombor.
