# skech

Bun-workspaces monorepo.

## Layout

```
.
├── package.json          # workspace root (workspaces: ui/*)
├── bunfig.toml           # hoisted install linker
├── tsconfig.base.json    # shared TS compiler options
└── ui/
    ├── landing/          # @skech/landing — marketing site  (port 3000)
    └── app/              # @skech/app     — product app     (port 3001)
```

Both apps are Next.js 16 (App Router, TypeScript, Tailwind v4, ESLint, Turbopack)
with the `@/*` import alias pointing at each app's `src/`.

## Getting started

```bash
bun install          # install every workspace from the root
bun run dev          # run landing + app together
bun run dev:landing  # http://localhost:3000
bun run dev:app      # http://localhost:3001
```

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | dev server for every workspace, in parallel |
| `bun run build` | production build for every workspace |
| `bun run start` | serve the production builds |
| `bun run lint` | ESLint across every workspace |
| `bun run typecheck` | `tsc --noEmit` across every workspace |
| `bun run clean` | remove `node_modules` and `.next` |

`typecheck` relies on the route types Next generates, so run `bun run build`
(or `bun run dev`) at least once in a fresh checkout before it will pass.

## Adding a workspace

Anything dropped in `ui/` is picked up automatically. For a shared package
(e.g. a component library), add its glob to `workspaces` in the root
`package.json` and depend on it as `"@skech/<name>": "workspace:*"`.
