# Agent Guide: React Router 7 + Cloudflare Workers

## Project Overview

Full-stack React Router 7 application deployed to Cloudflare Workers with server-side rendering, TypeScript, and TailwindCSS v4.

## Essential Commands

### Development
```bash
npm run dev          # Start dev server with HMR (localhost:5173)
npm run build        # Create production build
npm run preview      # Preview production build locally
```

### Type Safety
```bash
npm run typecheck    # Generate types and run TypeScript compiler
npm run cf-typegen   # Generate types for Cloudflare bindings from wrangler.json
```

### Deployment
```bash
npm run check        # Full verification: typecheck + build + deploy dry-run
npm run deploy       # Deploy to Cloudflare Workers
```

## Architecture

### Directory Structure
```
├── app/
│   ├── routes/          # Route components (files)
│   ├── welcome/         # Shared components
│   ├── app.css          # Global styles (TailwindCSS v4)
│   ├── root.tsx         # Root layout + ErrorBoundary
│   ├── routes.ts        # Route configuration (NOT file-system routing)
│   └── entry.server.tsx # SSR entry point
├── workers/
│   └── app.ts           # Cloudflare Worker entry point
└── wrangler.json        # Cloudflare config + environment variables
```

### Request Flow
1. Request hits Cloudflare Worker at `workers/app.ts`
2. Worker passes request to React Router handler with Cloudflare context
3. Route loaders execute with access to `context.cloudflare.env`
4. Entry server renders to stream with bot detection
5. Response sent with streaming SSR

### Configuration Files
- `tsconfig.json` - Base TypeScript config (project references)
- `tsconfig.cloudflare.json` - App TypeScript config (includes `app/`, `workers/`)
- `tsconfig.node.json` - Node TypeScript config (build tools)
- `vite.config.ts` - Vite plugins: Cloudflare, TailwindCSS, React Router, tsconfig paths
- `react-router.config.ts` - React Router config (SSR enabled, Vite env API)
- `wrangler.json` - Cloudflare Worker config, bindings, and environment variables

## Code Patterns

### Route Files
Routes are configured in `app/routes.ts`, not via file-system routing. Each route file exports:

```typescript
// app/routes/home.tsx
import type { Route } from "./+types/home";  // Auto-generated types

export function meta({}: Route.MetaArgs) {
  return [{ title: "Page Title" }, { name: "description", content: "..." }];
}

export function loader({ context }: Route.LoaderArgs) {
  // Access Cloudflare env vars
  return { data: context.cloudflare.env.YOUR_VAR };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.data}</div>;
}
```

**Critical**: Route types are auto-generated at `./+types/{routeName}`. Use this exact import pattern.

### Cloudflare Context Access
Environment variables defined in `wrangler.json` under `vars` are accessed via:

```typescript
export function loader({ context }: Route.LoaderArgs) {
  const value = context.cloudflare.env.VALUE_FROM_CLOUDFLARE;
  return { value };
}
```

Module augmentation in `workers/app.ts` extends the `AppLoadContext` interface.

### Root Layout
`app/root.tsx` defines the HTML shell, links, and `ErrorBoundary`. It uses `Outlet` to render child routes.

### TypeScript Path Alias
- `~/*` maps to `./app/*`
- Configured in `tsconfig.cloudflare.json`

## Styling

### TailwindCSS v4
Uses the new TailwindCSS v4 syntax:

```css
/* app/app.css */
@import "tailwindcss" source(".");

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

No `tailwind.config.js` file - configuration is in CSS via `@theme`.

### Dark Mode
Dark mode is automatic based on system preference via `@media (prefers-color-scheme: dark)` in `app/app.css`.

## Important Gotchas

### Type Generation
- Route types (`./+types/*`) are generated automatically
- Run `npm run typecheck` before committing to ensure types are current
- Don't manually edit files in `.react-router/types/` or generated type files

### Environment Variables
- All environment variables must be defined in `wrangler.json` under `vars`
- Access via `context.cloudflare.env.VAR_NAME` (NOT `import.meta.env`)
- Run `npm run cf-typegen` after modifying `wrangler.json` to regenerate types

### Route Configuration
- Routes are NOT file-system based despite being in `app/routes/` directory
- All routes must be registered in `app/routes.ts`
- Use `index()` for root route, `route()` for nested routes

### SSR and Streaming
- SSR is enabled and required
- Bot detection waits for all content before responding (SEO)
- Streaming renders incrementally for non-bot clients
- Don't disable SSR unless you have a specific reason

### Module System
- Project is ES modules only (`"type": "module"` in package.json)
- No CommonJS or `require()`

### TypeScript Project References
- Uses TypeScript project references (composite builds)
- `tsconfig.json` references both `tsconfig.cloudflare.json` and `tsconfig.node.json`
- This enables strict type checking across different environments

### Deployment
- Source maps are uploaded to Cloudflare for debugging
- Deploy with `npm run deploy` after running `npm run check`
- Preview deployments available via `npx wrangler versions upload`

## Testing Patterns

No test framework is currently configured. When adding tests:
- Check existing patterns in the codebase first
- Consider testing loaders, components, and error boundaries
- Test Cloudflare Workers interactions if adding bindings

## Adding New Routes

1. Create route file in `app/routes/` (e.g., `about.tsx`)
2. Add route to `app/routes.ts`:
   ```typescript
   import { route } from "@react-router/dev/routes";
   export default [
     index("routes/home.tsx"),
     route("about", "routes/about.tsx"),  // /about
   ] satisfies RouteConfig;
   ```
3. Types will be auto-generated at `./+types/about`
4. Import types: `import type { Route } from "./+types/about";`
