// The Kubernetes probes. A resource route: plain text, no page.
export function loader() {
  return new Response("ok\n", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
