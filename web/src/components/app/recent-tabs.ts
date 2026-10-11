import { useSyncExternalStore } from "react";

/** Most tabs kept; opening one more drops the oldest. */
const MAX_TABS = 8;

/**
 * Recently viewed pages (their keyValues, oldest first), saved in localStorage per module
 * so the tab strip survives a reload. Components read it with useRecentTabs().
 */
const cache = new Map<string, string[]>();
const listeners = new Set<() => void>();

export function recentTabsKey(moduleCode: string) {
  return `ml:${moduleCode}:recent-tabs`;
}

function read(storageKey: string): string[] {
  let keys = cache.get(storageKey);
  if (!keys) {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      keys = Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
    } catch {
      keys = []; // storage blocked or corrupt: start empty
    }
    cache.set(storageKey, keys);
  }
  return keys;
}

function write(storageKey: string, keys: string[]) {
  cache.set(storageKey, keys);
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    // storage blocked (private mode): tabs still work for this session
  }
  listeners.forEach((notify) => notify());
}

/** Adds a page to the end of the strip if it is not already there. */
export function openRecentTab(storageKey: string, key: string) {
  const keys = read(storageKey);
  if (!keys.includes(key)) write(storageKey, [...keys, key].slice(-MAX_TABS));
}

export function closeRecentTab(storageKey: string, key: string) {
  write(storageKey, read(storageKey).filter((k) => k !== key));
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** The saved tab keys; re-renders whenever a tab is opened or closed. */
export function useRecentTabs(storageKey: string): string[] {
  return useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => [],
  );
}
