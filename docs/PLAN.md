# NARRATIV Web Client: Development Plan

Rencana pengembangan NARRATIV versi web (client untuk role `USER`, setara aplikasi Android). Dokumen ini acuan utama:
apa yang harus disiapkan di backend dan infra, urutan fase pengembangan web, serta progress tiap item.

- **Status:** Fase 0–4 selesai, berikutnya Fase 5
- **Dibuat:** 2026-11-20
- **Repo terkait:** `narrativ-backend`, `narrativ-android`, `homelabs-gitops`, `web-admin`, `web-landing`
- **Lokasi dokumen:** `narrativ-web-client/docs/PLAN.md`

**Cara update progress:** centang `[x]` saat item selesai dan isi kolom _Ref_ dengan nomor PR atau commit.
Status fase di tabel ringkasan ikut diperbarui. Item yang batal dicoret (`~~...~~`) dan diberi alasan, tidak dihapus.

---

## 1. Ringkasan progress

| Fase | Isi                                          | Status     |
| ---- | -------------------------------------------- | ---------- |
| 0    | Persiapan backend dan infra                  | ✅ Selesai |
| 1    | Fondasi dan walking skeleton (deploy ke dev) | ✅ Selesai |
| 2    | Autentikasi lewat API in-app (tanpa OAuth)   | ✅ Selesai |
| 3    | Membaca konten (feed, post, profil, search)  | ✅ Selesai |
| 4    | Membuat konten dan interaksi                 | ✅ Selesai |
| 5    | Akun, notifikasi in-app, dan keamanan        | ⚪ Belum   |
| 6    | Sharing publik dan SEO (SSR)                 | ⚪ Belum   |
| 7    | Web push dan PWA                             | ⚪ Belum   |
| 8    | Google Sign-In (OAuth)                       | ⚪ Belum   |
| 9    | Hardening dan launch prod                    | ⚪ Belum   |

Legenda: ⚪ belum, 🟡 berjalan, ✅ selesai, ⛔ terblokir

---

## 2. Keputusan arsitektur

| #   | Keputusan                                                                                                                                                  | Alasan                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **React 19 + TypeScript strict**                                                                                                                           | Sama dengan `web-admin`. Ekosistem terbesar dan dukungan jangka panjang                                                                                                                                  |
| D2  | **React Router 8 framework mode** di atas Vite, mulai dengan `ssr: false` (SPA), SSR diaktifkan di Fase 6                                                  | Major terbaru saat Fase 1 dimulai (7 sudah digantikan). Satu keluarga dengan router `web-admin`. SSR dibutuhkan untuk preview link share (Open Graph). Tidak perlu migrasi framework saat SSR dinyalakan |
| D3  | Bukan Next.js                                                                                                                                              | Server Components dan Server Actions tumpang-tindih dengan Spring backend. Kompleksitas tanpa banyak manfaat                                                                                             |
| D4  | **Kontrak API di-generate dari OpenAPI backend** (`openapi-typescript` + `openapi-fetch`)                                                                  | Satu sumber kebenaran. Tipe tidak ditulis manual. Perubahan kontrak ketahuan saat typecheck                                                                                                              |
| D5  | **Access token di memory, refresh token di cookie httpOnly** (khusus web)                                                                                  | Refresh token 30 hari tidak boleh terbaca JavaScript (XSS). Android tetap memakai body                                                                                                                   |
| D6  | TanStack Query untuk server state, Zustand hanya untuk session dan UI state                                                                                | Server state tidak disalin ke store global                                                                                                                                                               |
| D7  | Struktur folder feature-based                                                                                                                              | Mirip layering `data/domain/ui` di Android. Fitur mudah ditemukan dan dihapus                                                                                                                            |
| D8  | Host: `app-narrativ.rizkysiregar.my.id` (prod), `app-dev-narrativ.rizkysiregar.my.id` (dev)                                                                | Ikut pola `api-`/`admin-`. Satu site dengan API sehingga cookie `SameSite=Strict` bisa dipakai                                                                                                           |
| D9  | Nama: folder `web-app/web-client`, repo `narrativ-web-client`, app gitops `narrativ-web-client-dev` (prod nanti `narrativ-web-client`)                     | Konsisten dengan `web-admin` dan `web-landing`, serta pola `narrativ` / `narrativ-dev`                                                                                                                   |
| D10 | **API di origin yang sama:** ingress host web merutekan `/api` ke `narrativ-service`, client memanggil `/api/v1` relatif. Dev server Vite mem-proxy `/api` | Tanpa CORS, cookie refresh first-party, CSP `connect-src 'self'`, dan satu image yang sama bisa dipromosikan dari dev ke prod tanpa build ulang                                                          |
| D11 | **Tema dark-only** dengan palet aplikasi (plum/lilac, Bricolage Grotesque), sama dengan Android dan `web-landing`                                          | Konsisten dengan brand. Komponen memakai token warna, sehingga tema terang cukup mendefinisikan ulang token                                                                                              |
| D12 | **CSP ketat sejak Fase 1:** script inline React Router diizinkan lewat hash SHA-256 yang dihitung saat build (`scripts/csp.mjs`)                           | Tidak perlu `'unsafe-inline'` untuk script. `style-src` masih `'unsafe-inline'` karena sonner menyisipkan stylesheet saat runtime                                                                        |
| D13 | Fase 1–5 di-deploy sebagai image nginx statis. Fase 6 (SSR) beralih ke server Node                                                                         | SPA tidak butuh server. Server Node baru diperlukan saat SSR dinyalakan                                                                                                                                  |
| D14 | Feed belum memakai virtualisasi (TanStack Virtual). Dievaluasi di Fase 9 kalau profil performa memerlukannya                                               | Kartu post tingginya bervariasi (media), sehingga virtualisasi dengan window scroll menambah kompleksitas yang besar. Feed dimuat 10 post per halaman dan jarang di-scroll sangat jauh                   |

---

## 3. Tech stack

| Layer        | Pilihan                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime      | Node 24 LTS                                                                                                                                              |
| Bahasa       | TypeScript 6 strict (`strict`, `noUncheckedIndexedAccess`). TS 7 belum dipakai karena typescript-eslint baru mendukung < 6.1                             |
| Framework    | React 19, React Router 8 (framework mode), Vite 8                                                                                                        |
| HTTP         | `openapi-fetch` dengan fetch kustom (Bearer, refresh + retry, `Accept-Language`, `X-Client-Platform`, `X-App-Version`)                                   |
| Server state | TanStack Query v5 (`useInfiniteQuery` untuk feed cursor, optimistic update)                                                                              |
| Client state | Zustand                                                                                                                                                  |
| Form         | React Hook Form + Zod                                                                                                                                    |
| UI           | Tailwind 4, shadcn/ui (Radix), lucide-react, sonner                                                                                                      |
| List panjang | TanStack Virtual                                                                                                                                         |
| i18n         | i18next + react-i18next (EN/ID)                                                                                                                          |
| Testing      | Vitest, Testing Library, MSW, Playwright (e2e)                                                                                                           |
| Kualitas     | ESLint flat config + typescript-eslint strict type-checked, Prettier, Husky + lint-staged. `eslint-plugin-jsx-a11y` menyusul setelah mendukung ESLint 10 |
| Monitoring   | Sentry atau GlitchTip (self-host), Web Vitals                                                                                                            |
| Deploy       | Docker (nginx unprivileged, Node mulai Fase 6), Jenkins, Argo CD via `homelabs-gitops`                                                                   |

### Struktur folder

Semua kode ada di `app/`, mengikuti konvensi React Router (alias `~/` = `app/`).

```
app/
  root.tsx           # dokumen, provider, error boundary, layar start-up
  routes.ts          # tabel route
  routes/            # tipis: routing, meta, loader/clientLoader saja
  api/
    schema.d.ts      # hasil generate, jangan diedit manual
    client.ts        # openapi-fetch
    fetch.ts         # header, token, refresh + retry
    session.ts       # access token di memory, refresh (single-flight + Web Lock)
    errors.ts        # ApiError, request() untuk membuka envelope
  features/
    auth/  feed/  post/  comments/  profile/  search/  notifications/  settings/
      api.ts         # query keys + hooks TanStack Query
      components/
      hooks/
      schemas.ts     # Zod
  shared/
    config/  i18n/  layout/  ui/  hooks/  lib/
```

**Aturan:**

- Komponen tidak memanggil HTTP langsung. Semua lewat hook di `features/*/api.ts`.
- Query key didefinisikan sebagai factory per fitur (`postKeys.detail(id)`), tidak ditulis sebagai string lepas.
- Data dari server tidak disalin ke Zustand.
- Fitur lain hanya boleh meng-import sebuah fitur lewat `index.ts`-nya (API publik fitur). Internal fitur tidak di-import
  dari luar. Yang dipakai banyak fitur tanpa logika domain dipindah ke `shared/`.

---

## 4. Pekerjaan backend dan infra

Kolom _Kapan_ menunjukkan paling lambat item harus selesai.

| ID    | Item                                                                                                                                                                                                             | Repo / tempat        | Kapan          | Status | Ref       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------- | ------ | --------- |
| BE-01 | Envelope `BaseResponse` dan schema error tampil di OpenAPI                                                                                                                                                       | backend              | Fase 0         | [x]    | #70       |
| BE-02 | Refresh token lewat cookie httpOnly untuk web                                                                                                                                                                    | backend              | Fase 0         | [x]    | #70       |
| BE-03 | Header `X-Client-Platform` / `X-App-Version` dicatat di access log                                                                                                                                               | backend              | Fase 0         | [x]    | #70       |
| BE-04 | ~~Origin web masuk `APP_CORS_ALLOWED_ORIGINS`~~ Tidak diperlukan: API diakses di origin yang sama (D10). Gantinya: rule `/api` di ingress host web                                                               | gitops ingress       | Fase 1         | [ ]    |           |
| BE-05 | ~~Aturan CORS bucket MinIO untuk origin web~~ Tidak diperlukan: MinIO sudah menjawab preflight dan upload dari `app-dev-narrativ` dengan header CORS yang benar (diuji)                                          | infra MinIO          | Fase 4         | [x]    | –         |
| BE-06 | Origin web ditambahkan ke _Authorized JavaScript origins_ OAuth client dev dan prod                                                                                                                              | Google Cloud Console | Fase 8         | [ ]    |           |
| BE-07 | Endpoint publik read-only: `GET /public/posts/{id}`, `GET /public/users/{username}`                                                                                                                              | backend              | Fase 6         | [ ]    |           |
| BE-08 | URL media stabil untuk `og:image` (redirect 302 ke presigned URL baru)                                                                                                                                           | backend              | Fase 6         | [ ]    |           |
| BE-09 | IP client dari server SSR diteruskan lewat header tepercaya dan bucket rate limit untuk `/public/**`                                                                                                             | backend              | Fase 6         | [ ]    |           |
| BE-10 | Format URL share disepakati (`/p/{postId}`, `/u/{username}`) untuk Android, notifikasi, dan email                                                                                                                | backend + android    | Fase 6         | [ ]    |           |
| BE-11 | `platform` device jadi enum `ANDROID`/`WEB`, payload `webpush`, subscribe topic `global` dari server, token `UNREGISTERED` dinonaktifkan                                                                         | backend              | Fase 7         | [ ]    |           |
| BE-12 | Web app terdaftar di Firebase dengan App Check reCAPTCHA Enterprise, app id masuk `allowed-apps`                                                                                                                 | Firebase + backend   | Fase 9         | [ ]    |           |
| BE-13 | (Opsional) Grace window rotasi refresh token, dievaluasi setelah Fase 2                                                                                                                                          | backend              | Setelah Fase 2 | [ ]    |           |
| BE-14 | (Opsional) Android mengirim `X-Client-Platform: android` dan `X-App-Version`                                                                                                                                     | android              | Kapan saja     | [ ]    |           |
| BE-15 | Response 4xx/5xx yang dibuat otomatis oleh springdoc dari exception handler (schema kosong) diganti dengan `ErrorResponse`                                                                                       | backend              | Fase 2         | [x]    | #71       |
| BE-16 | `GET /users/by-username/{username}` untuk URL profil `/u/{username}`, serta `page`/`size` di dokumen OpenAPI `GET /users`                                                                                        | backend              | Fase 3         | [x]    | #72       |
| BE-17 | Origin web masuk `APP_CORS_ALLOWED_ORIGINS` dev (sementara). Di belakang Cloudflare + ingress, backend melihat request sebagai `http://`, sehingga origin `https://` dianggap lintas origin dan POST ditolak 403 | gitops configmap     | Fase 3         | [x]    | gitops#13 |
| BE-18 | Akar masalah BE-17: ingress-nginx `use-forwarded-headers: "true"` agar `X-Forwarded-Proto: https` dari Cloudflare diteruskan. Setelah itu entri BE-17 tidak diperlukan lagi                                      | rke2 HelmChartConfig | Fase 9         | [ ]    |           |

### Detail BE-01: Envelope di OpenAPI

**Masalah:** response dibungkus `CustomResponseAdvise` setelah controller selesai. Akibatnya OpenAPI hanya menampilkan
DTO mentah, padahal client menerima `{code, message, data}`. Error handler mengembalikan `ResponseEntity<?>`, jadi
schema error juga tidak ada.

**Solusi:** `OperationCustomizer` springdoc yang:

- membungkus schema setiap response 2xx milik controller di `com.rizkysiregar.narrativ.controller` menjadi
  `{code, message, data: <schema asli>}`. Pengecualian mengikuti aturan `CustomResponseAdvise`: method
  `@IgnoreResponseBinding`, return type `ResponseEntity`, `Resource`, `byte[]`, dan `String`.
- menambahkan component `ErrorResponse` (`code`, `message`, `errorCode`, `args`) sebagai response `default`.

Frontend generate tipe dari `https://api-dev-narrativ.rizkysiregar.my.id/api/v1/v3/api-docs` (Swagger aktif di dev,
mati di prod).

### Detail BE-02: Refresh token lewat cookie

Berlaku hanya untuk request yang membawa header `X-Client-Platform: web`. Android tidak berubah.

| Endpoint                                              | Perilaku untuk web                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST /auth/login`, `/auth/google`, `/users/me/email` | Set cookie refresh token. Field `refreshToken` di body dikosongkan                |
| `POST /auth/refresh`                                  | Token dibaca dari cookie kalau body kosong. Token baru ditulis ke cookie (rotasi) |
| `POST /auth/logout`                                   | Token dari cookie dicabut dan cookie dihapus                                      |

**Cookie:** `narrativ_refresh`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth`, `Max-Age` 30 hari
(sama dengan TTL di Redis).

**Perlindungan CSRF:**

- `SameSite=Strict`: cookie tidak terkirim dari site lain.
- Cookie hanya dibaca kalau ada header custom `X-Client-Platform: web`. Header custom memaksa preflight CORS, dan
  preflight hanya lolos untuk origin yang terdaftar.

**Pengembangan lokal:** dev server Vite mem-proxy `/api` ke backend, sehingga cookie menjadi first-party di
`localhost`.

**Catatan:** login admin sengaja tidak memakai cookie. `web-admin` dan web client memanggil host API yang sama, jadi
keduanya akan saling menimpa cookie. Kalau `web-admin` nanti ikut memakai cookie, gunakan nama cookie terpisah.

**Perubahan untuk endpoint `/users/me/email`:** endpoint ini juga mengembalikan `LoginResponse` (sesi baru setelah
ganti email), jadi diperlakukan sama.

### Detail BE-03: Identitas client

`RequestTraceFilter` menambahkan `client=<platform>/<version>` ke baris `HTTP.REQUEST`, sehingga log dan debugging
bisa membedakan web dan Android.

---

## 5. Fase pengembangan web

Setiap fase selesai kalau semua item tercentang dan _Definition of Done_ (bagian 7) terpenuhi.

### Fase 0: Persiapan backend dan infra ✅

- [x] BE-01, BE-02, BE-03 dalam satu PR backend, merge ke `master`, otomatis deploy ke `narrativ-dev` (PR [#70](https://github.com/rizkysiregar/narrativ-backend/pull/70))
- [x] Cek `https://api-dev-narrativ.rizkysiregar.my.id/api/v1/v3/api-docs` menampilkan envelope
- [x] Cek alur cookie di dev: logout dengan header web menghapus cookie, refresh tanpa token menjawab 401.
      Login sampai refresh dengan akun sungguhan diuji di Fase 2

### Fase 1: Fondasi dan walking skeleton ✅

- [x] Repo [`narrativ-web-client`](https://github.com/rizkysiregar/narrativ-web-client) (private) di GitHub, folder `web-app/web-client`
- [x] Scaffold React Router 8 (framework mode, `ssr: false`), TypeScript strict, Tailwind 4.
      Komponen shadcn/ui ditambahkan per kebutuhan mulai Fase 2 (form)
- [x] ESLint, Prettier, Husky + lint-staged, Vitest + Testing Library + MSW
- [x] Script `api:generate` dan `api:check` dari OpenAPI dev, hasilnya di-commit
- [x] API client: Bearer, refresh saat 401 lalu retry, satu refresh untuk banyak request (single-flight),
      Web Locks untuk refresh lintas tab, `Accept-Language`, `X-Client-Platform: web`, `X-App-Version`
- [x] `ApiError` (`errorCode`, deteksi ban), sesi berakhir saat refresh ditolak dan alasan ban disimpan.
      Tampilannya (halaman login, banner) di Fase 2
- [x] i18n EN/ID dengan key bertipe, tema dark-only (D11), layout dasar: sidebar desktop, top bar + tab bar mobile
- [x] Error boundary, halaman 404, banner offline, placeholder untuk halaman fase berikutnya
- [x] Dockerfile (nginx), CSP berbasis hash (D12), Jenkinsfile (pola `web-admin`, Node 24), `.env.example`, README
- [x] `homelabs-gitops/apps/narrativ-web-client-dev` (deployment, service, ingress dengan rule `/api`, kustomization) (PR [homelabs-gitops#12](https://github.com/rizkysiregar/homelabs-gitops/pull/12))
- [x] Cloudflare Tunnel hostname `app-dev-narrativ.rizkysiregar.my.id`
- [x] Pipeline Jenkins `narrativ-web-client` dan Argo CD Application (dibuat manual, langkahnya di README gitops)
- [x] Halaman ter-deploy di `app-dev-narrativ.rizkysiregar.my.id`, `/healthz` menjawab 200, `/api/v1` sampai ke backend

### Fase 2: Autentikasi lewat API in-app ✅

Hanya memakai endpoint auth milik backend sendiri. Login Google dipisah ke Fase 8 karena butuh konfigurasi Firebase
dan Google Client ID.

- [x] BE-15 selesai (PR [backend#71](https://github.com/rizkysiregar/narrativ-backend/pull/71)), lalu `npm run api:generate`
- [x] Komponen form (input, password dengan tombol tampilkan, form field dengan error yang terbaca screen reader,
      alert) + React Hook Form + Zod. Aturan validasi mengikuti backend (username, password ≤ 72 byte, OTP)
- [x] Login username + password, kembali ke halaman yang diminta (`?redirect=`, aman dari open redirect)
- [x] Register dengan OTP email (dengan dan tanpa verifikasi, mengikuti `verificationRequired`), lalu langsung masuk.
      Username yang sudah dipakai kembali ke form tanpa meminta kode lagi (token registrasi dipakai ulang < 9 menit)
- [x] Forgot password: kirim OTP, verifikasi, password baru. Kirim ulang kode dengan jeda 60 detik
- [x] Silent refresh saat aplikasi dibuka (`clientLoader` root), guard untuk route yang butuh login dan untuk tamu
- [x] Logout (cabut cookie, kosongkan cache), alasan ban tampil di halaman login
- [x] Diuji langsung terhadap backend dev lewat proxy: register, login (cookie tersimpan, tanpa `refreshToken` di
      body), refresh tanpa body, `/users/me`, logout, refresh setelah logout ditolak
- [ ] Evaluasi BE-13 berdasarkan perilaku multi-tab (setelah web client dipakai di dev)

### Fase 3: Membaca konten ✅

- [x] Origin MinIO (`https://infra-minio.rizkysiregar.my.id`, sama untuk dev dan prod) ditambahkan ke CSP `img-src`
      dan `media-src`
- [x] Feed Beranda (`/posts`, sama dengan `/posts/following`) dan Jelajahi dengan infinite scroll cursor
      (IntersectionObserver + tombol "Tampilkan lebih banyak"). Virtualisasi ditunda (D14)
- [x] Label post `suggested`, post yang diturunkan moderator
- [x] Detail post `/p/:postId`, media carousel (scroll snap, indikator posisi, gambar dan video dengan thumbnail)
- [x] Profil `/u/:username` (BE-16): header dengan jumlah pengikut/mengikuti, tab Postingan dan Media (grid),
      daftar followers/following, tab Profil membuka profil sendiri
- [x] Search user `/search?q=` dengan debounce, hasil berhalaman
- [x] Penanganan presigned URL yang kedaluwarsa: gambar gagal dimuat memicu fetch ulang feed (paling sering sekali
      per menit)
- [x] Diuji dengan data dev lewat build produksi + proxy: login, sesi pulih setelah reload, beranda, jelajahi,
      detail post dengan 3 gambar, search, desktop dan mobile 390px
- [x] BE-16 merged, lalu `npm run api:generate` (sama dengan tambahan manual sementara)
- [x] BE-17 merged dan pod backend dev di-restart: login di `app-dev-narrativ` berfungsi di browser (Playwright)
- [x] Profil, tab Media, followers, dan profil sendiri diuji dengan data dev. Tile grid Media diperbaiki agar persegi

### Fase 4: Membuat konten dan interaksi ✅

- [x] BE-05 tidak diperlukan (MinIO sudah mengizinkan origin web). Origin MinIO ditambahkan ke CSP `connect-src`
- [x] Buat post (dialog dari tombol di sidebar, tombol melayang di mobile): caption maks. 500, maks. 5 media, validasi
      tipe dan ukuran seperti backend (foto 5 MB, video mp4/mov/webm 50 MB), upload langsung ke MinIO lewat presigned
      POST form dengan progress per file, coba lagi tanpa mengulang file yang sudah terupload, tutup = batal
- [x] Hapus post sendiri (dengan konfirmasi), hilang dari semua feed di cache
- [x] Like/unlike optimistic di semua salinan cache, kembali semula kalau ditolak
- [x] Komentar dan reply (satu tingkat, seperti backend), hapus komentar (konfirmasi), pin/lepas pin oleh pemilik post
- [x] Follow/unfollow optimistic dari profil (jumlah pengikut ikut berubah), tidak tampil di profil sendiri
- [x] Diuji langsung terhadap backend dev di Chrome (Playwright), pada konten akun uji sendiri: buat post dengan
      gambar sungguhan, like, komentar, reply, pin, hapus reply, hapus post
- [ ] Quote caption pada komentar (`quoteText`) dipindah ke Fase 5

### Fase 5: Akun, notifikasi in-app, dan keamanan ⚪

- [ ] Quote caption pada komentar (`quoteText`, hanya komentar level atas, teks harus ada di caption)
- [ ] Edit profil, upload/ganti/hapus foto profil
- [ ] Ganti email lewat OTP (sesi baru lewat cookie)
- [ ] Inbox notifikasi: daftar, jumlah belum dibaca, tandai sudah dibaca
- [ ] Blokir/buka blokir dan daftar blokir
- [ ] Report post, komentar, dan user
- [ ] Hapus akun
- [ ] Link ke halaman legal (privacy policy, terms)

### Fase 6: Sharing publik dan SEO ⚪

- [ ] BE-07, BE-08, BE-09, BE-10 selesai
- [ ] Aktifkan SSR untuk `/p/:postId` dan `/u/:username`: Open Graph, Twitter Card, canonical
- [ ] Tombol share (Web Share API dengan fallback salin link)
- [ ] `robots.txt`, sitemap profil publik
- [ ] `/.well-known/assetlinks.json` supaya link terbuka di aplikasi Android
- [ ] Uji preview di WhatsApp, X, dan Facebook Sharing Debugger

### Fase 7: Web push dan PWA ⚪

- [ ] BE-11 selesai
- [ ] Firebase Messaging di web, service worker, alur izin notifikasi yang tidak mengganggu
- [ ] Registrasi device `WEB` saat login, deaktivasi saat logout
- [ ] Klik notifikasi membuka post atau profil terkait
- [ ] Web app manifest dan ikon, aplikasi bisa di-install

### Fase 8: Google Sign-In (OAuth) ⚪

Dipisah dari Fase 2 karena butuh konfigurasi bolak-balik di Firebase dan Google Cloud Console.

- [ ] BE-06 selesai untuk dev, lalu prod
- [ ] Google Identity Services: tombol "Sign in with Google" di halaman login dan register, kirim ID token ke `POST /auth/google`
- [ ] Penanganan akun yang sudah ada dengan email sama (backend menautkan otomatis), user dibatalkan, dan popup diblokir
- [ ] Ganti email untuk akun Google (`/users/me/email` dengan ID token baru)
- [ ] CSP mengizinkan domain Google Identity Services

### Fase 9: Hardening dan launch prod ⚪

- [ ] Content-Security-Policy ketat dan security headers
- [ ] Audit aksesibilitas (keyboard, screen reader, kontras)
- [ ] Budget Lighthouse (Performance dan Accessibility ≥ 90 di mobile)
- [ ] E2E Playwright untuk alur utama di CI: login, buka feed, buat post, like, komentar
- [ ] Sentry/GlitchTip terpasang dengan source map
- [ ] BE-12, lalu App Check `enforce` dievaluasi
- [ ] App gitops prod `narrativ-web-client` (ingress dengan rule `/api` ke backend prod), host `app-narrativ.rizkysiregar.my.id`
- [ ] Link dari `web-landing` ke web app

---

## 6. Alur integrasi per fitur

1. Endpoint backend tersedia di dev dan tampil di OpenAPI.
2. `npm run api:generate` memperbarui `src/api/schema.d.ts`.
3. Tulis query key dan hook di `features/<x>/api.ts`.
4. Buat handler MSW, lalu kerjakan UI tanpa harus menunggu backend.
5. Unit test untuk hook, komponen, dan jalur error.
6. PR: CI menjalankan lint, typecheck, test, build, dan cek bahwa `schema.d.ts` sinkron dengan OpenAPI.
7. Merge: deploy otomatis ke dev, lalu uji manual terhadap `api-dev-narrativ`.
8. Promote ke prod (mulai Fase 9).

Kalau fitur web butuh perubahan backend, PR backend dibuat dan di-merge lebih dulu, lalu langkah 2 diulang.

---

## 7. Definition of Done

Setiap item fitur dianggap selesai kalau:

- Lint, typecheck, dan seluruh test hijau di CI.
- Ada test untuk logika baru (hook, util, komponen dengan interaksi).
- State loading, kosong, dan error ditangani dan diterjemahkan (EN/ID).
- Bisa dipakai di layar mobile (360px) dan desktop, serta dengan keyboard.
- Sudah diuji manual di dev terhadap backend dev.
- Checkbox di dokumen ini dicentang dan diberi ref PR.

---

## 8. Konvensi

- **Branch:** `feat/...`, `fix/...`, `chore/...`, `ci/...`, `docs/...` dari `main`/`master`.
- **Commit:** Conventional Commits, contoh `feat(feed): infinite scroll on the home feed`.
- **PR:** bagian _Summary_, _Deploy notes_ (kalau ada), dan _Test plan_ dengan checkbox, sama dengan repo backend.
- **Env var:** hanya `VITE_*` yang terbaca di client. Tidak ada secret di bundle.

---

## 9. Risiko dan mitigasi

| Risiko                                                                                                                          | Mitigasi                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Refresh bersamaan di beberapa tab membuat user ter-logout (rotasi sekali pakai)                                                 | Web Locks API di client (Fase 1). BE-13 kalau masih terjadi                                                               |
| Pengujian dengan curl tanpa header `Origin` tidak menangkap penolakan CORS yang dialami browser                                 | Uji alur penting dengan browser sungguhan (Playwright) terhadap dev, termasuk header `Origin`                             |
| Cek lokal lulus karena memakai file hasil generate yang tertinggal (`.react-router/`), sementara CI mulai dari workspace bersih | Script `lint` dan `typecheck` menjalankan `typegen` sendiri. Sebelum PR yang mengubah tooling: `verify` dari clone bersih |
| Presigned URL kedaluwarsa 1 jam saat tab dibiarkan terbuka                                                                      | Refetch query saat gambar gagal dimuat atau saat tab kembali aktif                                                        |
| Preview link share rusak karena `og:image` kedaluwarsa                                                                          | BE-08                                                                                                                     |
| Semua pengunjung SSR terbaca satu IP oleh rate limiter                                                                          | BE-09                                                                                                                     |
| App Check di-enforce sebelum web siap, login web jadi 403                                                                       | BE-12 harus selesai sebelum mode `enforce`                                                                                |
| Tipe frontend tidak sinkron dengan backend                                                                                      | Generate dari OpenAPI dan cek sinkron di CI                                                                               |

---

## 10. Log perubahan dokumen

| Tanggal    | Perubahan                                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-20 | Versi awal                                                                                                                                                                                                                                  |
| 2026-11-20 | PR backend #70 dibuat (BE-01, BE-02, BE-03)                                                                                                                                                                                                 |
| 2026-11-20 | #70 merged dan terverifikasi di dev. Fase 0 selesai. Google Sign-In dipindah ke Fase 8 tersendiri, hardening jadi Fase 9                                                                                                                    |
| 2026-11-20 | Fase 2: alur auth in-app selesai di branch `feat/auth`. BE-15 di PR backend #71                                                                                                                                                             |
| 2026-11-20 | Fase 1 selesai: web client live di `app-dev-narrativ`. PR #1 (auth) dan backend #71 merged, tipe API di-generate ulang. Pipeline membersihkan workspace sebelum verify                                                                      |
| 2026-11-20 | Fase 2 selesai. Fase 3 di branch `feat/read-content`. Ditemukan: POST dari browser di `app-dev-narrativ` ditolak 403 (BE-17, BE-18). BE-16 untuk profil by username. D14 (virtualisasi ditunda). Aturan import antar fitur lewat `index.ts` |
| 2026-11-20 | BE-16 (backend #72) dan BE-17 (gitops #13) merged. Login di `app-dev-narrativ` berfungsi. Fase 3 selesai (PR #3)                                                                                                                            |
| 2026-11-20 | Fase 1: fondasi selesai di repo. Keputusan D10–D13 (API same-origin, dark-only, CSP hash, nginx sampai Fase 6), React Router 8, BE-04 diganti rule ingress, BE-15 ditambahkan                                                               |
| 2026-11-20 | Fase 4 selesai (PR #4). BE-05 tidak diperlukan. Layout tidak lagi meng-import fitur (slot di `AppShell`)                                                                                                                                    |
| 2026-11-20 | Build merge #3 dan #4 gagal di lint (tipe route belum di-generate di CI); dev masih Fase 2. Diperbaiki di PR #5                                                                                                                             |
