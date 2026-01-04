export const DEMO_MODE_KEY = "demoMode";

export function isDemoMode(): boolean {
  try {
    return sessionStorage.getItem(DEMO_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoMode(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(DEMO_MODE_KEY, "1");
    else sessionStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    // ignore
  }
}

export function clearDemoMode(): void {
  setDemoMode(false);
}


