const WELCOME_COMPLETE_KEY = "activity_match_welcome_complete";

export function hasCompletedWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeComplete(): void {
  try {
    localStorage.setItem(WELCOME_COMPLETE_KEY, "1");
  } catch {
    // ignore
  }
}
