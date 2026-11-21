/** package.json version, injected by Vite (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Sentry project DSN (public). Without it nothing is reported. Set by Jenkins at build time. */
  readonly VITE_SENTRY_DSN?: string;
  /** The release this build belongs to: the git commit (image tag), set by Jenkins. */
  readonly VITE_RELEASE?: string;
}
