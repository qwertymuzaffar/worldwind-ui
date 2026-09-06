# Contributing

Thanks for helping with worldwind-ui. This page covers the setup, the checks, and the conventions
the repository follows.

## Setup

- Node 22 (see `.nvmrc`) and npm 10 or newer.
- `npm ci` installs every workspace; `.npmrc` sets `legacy-peer-deps` on purpose.
- `npm run build` builds `worldwind-kit`, `react-worldwind` and `ngx-worldwind`. The demos and the
  Angular tests resolve the packages from their `dist` folders, so build once before running them.

## Checks

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the three packages (Vitest, jsdom, the fake WorldWind from `worldwind-kit/testing`) |
| `npm run test:coverage` | The same with a coverage report in `coverage/` |
| `npm run lint` | ESLint over the whole repository |
| `npm run typecheck` | `tsc` for every package, demo and the browser tests |
| `npm run size` | Gzipped size of each package against the limits in `package.json` |
| `npm run e2e` | Playwright against the assembled docs site (`npm run build:pages` first; `npx playwright install` once) |
| `npm run bench` | The frame-time table on the performance page (needs a local Chrome) |

CI runs all of these on every pull request except the bench. Please run at least `npm test`,
`npm run lint` and `npm run typecheck` before pushing.

## Layout

- `packages/kit` is the framework-agnostic core. Everything a widget needs to know about WorldWind
  lives here, with unit tests in `packages/kit/test`.
- `packages/react` and `packages/angular` are thin adapters over the kit. A feature normally lands
  in the kit first, then in both adapters, then in both demos.
- `examples/` holds the demos and the bench page; `website/` the VitePress docs; `e2e/` the
  browser tests.

WorldWind itself is not bundled: it is a peer dependency, loaded lazily, and tests use the fake in
`packages/kit/src/testing` rather than WebGL. If you need something the fake does not model, extend
the fake in the same change.

## Branches, commits and releases

- Work on a branch named `type/short-description` (`feat/vertex-snapping`, `fix/legend-alt-text`).
- Commit messages follow `type: Capitalized imperative subject` with a subject of at most 50
  characters, optionally followed by a body wrapped at 72 characters that explains what and why.
  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- Anything that changes a published package needs a changeset: run `npm run changeset`, pick the
  packages (they are versioned together) and describe the change for the changelog. Docs-only or
  CI-only changes do not need one.
- Releases are cut from `main` by the release workflow: it opens a "Version Packages" pull request
  from the pending changesets, and merging that publishes to npm through trusted publishing.

## Pull requests

Keep them focused. A good pull request has tests for the kit change, updated adapters, a note in
the docs when the public API changes, and a changeset when a package changes. The template lists
the same points.
