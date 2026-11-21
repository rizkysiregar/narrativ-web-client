// Waits until a deployed environment serves the given release (build/client/version.json, written by Jenkins), so
// the smoke tests run against the new build and not the one Argo CD is replacing.
//   node scripts/wait-for-release.mjs https://app-dev-narrativ.rizkysiregar.my.id <release> [timeoutSeconds]
const [base, release, timeout = "900"] = process.argv.slice(2);
if (!base || !release) {
  console.error("usage: wait-for-release.mjs <baseUrl> <release> [timeoutSeconds]");
  process.exit(2);
}
const deadline = Date.now() + Number(timeout) * 1000;
let seen = "";
while (Date.now() < deadline) {
  try {
    const response = await fetch(new URL("/version.json", base), { cache: "no-store" });
    seen = response.ok ? ((await response.json()).release ?? "") : `HTTP ${response.status}`;
  } catch (error) {
    seen = String(error);
  }
  if (seen === release) {
    console.log(`${base} serves ${release}.`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
console.error(`${base} still serves ${seen || "nothing"} after ${timeout}s, not ${release}.`);
process.exit(1);
