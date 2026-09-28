const AUTH_SESSION_KEY = "auth:authenticated";

export function markAuthenticated() {
  localStorage.setItem(AUTH_SESSION_KEY, "true");
}

export function clearAuthenticated() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function isAuthenticated() {
  return localStorage.getItem(AUTH_SESSION_KEY) === "true";
}
