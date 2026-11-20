# NARRATIV Web Client

The web version of NARRATIV for users (role `USER`): the same social storytelling app as the Android client, in the
browser. The admin panel is a separate project (`narrativ-web-admin`), the public website is `narrativ-web-landing`.

The development plan, its phases and their progress live in [docs/PLAN.md](docs/PLAN.md).

## Tech stack

| Area         | Technology                                                               |
| ------------ | ------------------------------------------------------------------------ |
| Runtime      | Node 24 LTS (`.tool-versions`)                                           |
| Framework    | React 19, React Router 8 (framework mode, server rendering), Vite 8      |
| Language     | TypeScript 6, strict                                                     |
| API          | `openapi-fetch` with types generated from the backend's OpenAPI document |
| Server state | TanStack Query 5                                                         |
| Client state | Zustand (session only)                                                   |
| Styling      | Tailwind CSS 4, the app's dark palette and Bricolage Grotesque           |
| i18n         | i18next (Indonesian, English)                                            |
| Tests        | Vitest, Testing Library, MSW                                             |
| Quality      | ESLint (typescript-eslint strict), Prettier, Husky + lint-staged         |
| Delivery     | Node image (react-router-serve), Jenkins, Argo CD (`homelabs-gitops`)    |

## Getting started

```bash
asdf install            # Node 24 from .tool-versions (or any Node >= 24.11)
npm install
npm run dev             # http://localhost:3000, /api proxied to the dev backend
```

`.env.example` lists the optional settings (another backend, another port). Copy it to `.env.local`.

| Script                 | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                       |
| `npm run build`        | Production build to `build/client` and `build/server`            |
| `npm start`            | Serves the build (server rendering) on `PORT`, default 3000      |
| `npm run verify`       | Prettier check, ESLint, typecheck and unit tests (what CI runs)  |
| `npm test`             | Unit tests once (`test:watch` to keep them running)              |
| `npm run api:generate` | Regenerates `app/api/schema.d.ts` from the dev backend's OpenAPI |
| `npm run api:check`    | Fails when `schema.d.ts` differs from what the backend serves    |

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

## Shared links and server rendering

Posts (`/p/:postId`) and profiles (`/u/:username`) can be shared. Their route loaders run on the server: they read the
backend's public endpoints (`/public/**`) inside the cluster, passing on the visitor's `CF-Connecting-IP` so the
backend's rate limit counts the visitor, and answer link preview crawlers with Open Graph and Twitter tags. A visitor
without a session sees a public preview with a way to sign in; a signed-in user gets the full page. Everything else
renders in the browser: the app layouts render the start-up screen on the server (`clientLoader.hydrate`).

## Project structure

```
app/
  root.tsx              document, providers, error boundary, start-up screen
  routes.ts             route table; routes/ holds thin route modules
  api/                  generated schema, typed client, session and refresh, errors
  features/<name>/      one folder per feature (auth, feed, post, ...): api.ts hooks, components, schemas
  shared/               config, i18n, layout, ui primitives, hooks, lib
  server/               server-only config and the security headers of rendered pages
  entry.server.tsx      server rendering with a CSP nonce per response
scripts/                OpenAPI type generation
```

Rules: components never call `fetch` or the client directly but use the hooks in `features/<name>/api.ts`; server
data stays in TanStack Query and is not copied into Zustand; a feature does not import another feature's internals
(what both need moves to `shared/`).

## Deployment

Every push to `main` runs the `Jenkinsfile`: verify, API contract check (marks the build unstable when the backend
moved on), build, image `ghcr.io/rizkysiregar/narrativ-web-client:<sha>`, and a commit of the new tag to
`homelabs-gitops/apps/narrativ-web-client-dev`, which Argo CD syncs to `https://app-dev-narrativ.rizkysiregar.my.id`.

The image runs `react-router-serve` (Node 24) on port 8080, with `/healthz` for the probes. Every page response gets
its own CSP nonce for React Router's inline scripts (`app/entry.server.tsx`), so scripts need no `'unsafe-inline'`.

| Env var                                  | Meaning                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `API_INTERNAL_URL`                       | The backend inside the cluster, e.g. `http://narrativ-service.narrativ-dev.svc.cluster.local/api/v1` |
| `APP_ORIGIN`                             | Public address of the app, for absolute links in previews                                            |
| `ALLOW_INDEXING`                         | `true` only in production: robots.txt opens shared links, no `X-Robots-Tag`                          |
| `ANDROID_PACKAGE`, `ANDROID_CERT_SHA256` | Serve `/.well-known/assetlinks.json` (App Links), fingerprints comma separated                       |
