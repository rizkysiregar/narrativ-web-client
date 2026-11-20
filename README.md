# NARRATIV Web Client

The web version of NARRATIV for users (role `USER`): the same social storytelling app as the Android client, in the
browser. The admin panel is a separate project (`narrativ-web-admin`), the public website is `narrativ-web-landing`.

The development plan, its phases and their progress live in [docs/PLAN.md](docs/PLAN.md).

## Tech stack

| Area         | Technology                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| Runtime      | Node 24 LTS (`.tool-versions`)                                               |
| Framework    | React 19, React Router 8 (framework mode, SPA for now), Vite 8               |
| Language     | TypeScript 6, strict                                                         |
| API          | `openapi-fetch` with types generated from the backend's OpenAPI document     |
| Server state | TanStack Query 5                                                             |
| Client state | Zustand (session only)                                                       |
| Styling      | Tailwind CSS 4, the app's dark palette and Bricolage Grotesque               |
| i18n         | i18next (Indonesian, English)                                                |
| Tests        | Vitest, Testing Library, MSW                                                 |
| Quality      | ESLint (typescript-eslint strict), Prettier, Husky + lint-staged             |
| Delivery     | nginx image, Jenkins, Argo CD (`homelabs-gitops/apps/narrativ-web-client-*`) |

## Getting started

```bash
asdf install            # Node 24 from .tool-versions (or any Node >= 24.11)
npm install
npm run dev             # http://localhost:3000, /api proxied to the dev backend
```

`.env.example` lists the optional settings (another backend, another port). Copy it to `.env.local`.

| Script                 | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | Dev server with hot reload                                         |
| `npm run build`        | Production build to `build/client` plus `build/nginx` (CSP header) |
| `npm run verify`       | Prettier check, ESLint, typecheck and unit tests (what CI runs)    |
| `npm test`             | Unit tests once (`test:watch` to keep them running)                |
| `npm run api:generate` | Regenerates `app/api/schema.d.ts` from the dev backend's OpenAPI   |
| `npm run api:check`    | Fails when `schema.d.ts` differs from what the backend serves      |

## How it talks to the backend

- **Same origin.** The API is always called at `/api/v1` on the app's own host: the ingress routes `/api` to the
  backend (and the dev server proxies it in development). No CORS, and one image runs in every environment.
- **Typed client.** `app/api/client.ts` is generated from the backend's OpenAPI document. Wrap calls in `request()`
  to get the `data` of the backend's `{code, message, data}` envelope or an `ApiError`:

  ```ts
  const me = await request(api.GET("/users/me"));
  ```

  After a backend change: `npm run api:generate` and commit `app/api/schema.d.ts`.

- **Session.** The access token lives in memory only. The refresh token is an HttpOnly cookie the backend sets for
  `X-Client-Platform: web`, so scripts never see it. On a 401 the client refreshes once (shared by concurrent calls
  and serialized across tabs with a Web Lock, because the backend rotates the refresh token) and repeats the call.
- Every call sends `X-Client-Platform: web`, `X-App-Version` and `Accept-Language`, so the backend answers in the
  user's language.

## Project structure

```
app/
  root.tsx              document, providers, error boundary, start-up screen
  routes.ts             route table; routes/ holds thin route modules
  api/                  generated schema, typed client, session and refresh, errors
  features/<name>/      one folder per feature (auth, feed, post, ...): api.ts hooks, components, schemas
  shared/               config, i18n, layout, ui primitives, hooks, lib
scripts/                OpenAPI type generation, CSP header generation
nginx/                  server config of the image
```

Rules: components never call `fetch` or the client directly but use the hooks in `features/<name>/api.ts`; server
data stays in TanStack Query and is not copied into Zustand; a feature does not import another feature's internals
(what both need moves to `shared/`).

## Deployment

Every push to `main` runs the `Jenkinsfile`: verify, API contract check (marks the build unstable when the backend
moved on), build, image `ghcr.io/rizkysiregar/narrativ-web-client:<sha>`, and a commit of the new tag to
`homelabs-gitops/apps/narrativ-web-client-dev`, which Argo CD syncs to `https://app-dev-narrativ.rizkysiregar.my.id`.

The image is nginx serving `build/client` with an SPA fallback, `/healthz` for the probes and security headers. The
Content-Security-Policy allows React Router's inline start-up scripts by their SHA-256 hash, computed at build time
by `scripts/csp.mjs`, so scripts need no `'unsafe-inline'`.
