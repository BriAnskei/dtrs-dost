export const AUTH_SESSION_EXPIRED = "auth:session-expired";

export function notifySessionExpired() {
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED));
}
