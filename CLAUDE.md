# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev-server    # Start webpack dev server at https://localhost:3000
npm run build         # Production build (replaces localhost URLs with contoso.com)
npm run build:dev     # Development build
npm run watch         # Development build with watch mode
npm run lint          # Lint check
npm run lint:fix      # Auto-fix lint issues
npm run start         # Launch Word Desktop and sideload add-in (requires Office)
npm run stop          # Stop debugging and remove add-in
npm run validate      # Validate manifest.xml
```

No test suite is configured in this project.

## Architecture

This is a **Word task pane Office Add-in** using React + TypeScript + Fluent UI v9, bundled with Webpack.

**Two entry points** defined in `webpack.config.js`:
- `taskpane` — the React app (`src/taskpane/index.tsx` → `App.tsx`) rendered in the side panel
- `commands` — ribbon button handlers (`src/commands/commands.ts`), runs in a hidden iframe

**Word JS API access** is in `src/taskpane/taskpane.ts`. Functions here call `Word.run()` and are imported by React components. All Office API calls must be wrapped in `Word.run(async (context) => { ... await context.sync(); })`.

**manifest.xml** defines the add-in identity, host (Word/Document), ribbon button, and URLs pointing to `https://localhost:3000` in dev (replaced with `urlProd` on production build).

**Dev server** runs on HTTPS (port 3000) using self-signed certs from `office-addin-dev-certs`. The add-in is sideloaded into Word Desktop via `office-addin-debugging`.

**Production deployment**: update `urlProd` in `webpack.config.js` before running `npm run build`.
