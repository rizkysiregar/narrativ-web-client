// localStorage can be missing (pre-rendering) or throw (private mode, blocked site data): it only ever holds
// preferences, so a failure falls back to the default.

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // the preference just does not survive a reload
  }
}
