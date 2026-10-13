import axios from "axios";

/** Same-origin "/api", proxied to the LogisticApi by vite.config.ts during development. */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});
