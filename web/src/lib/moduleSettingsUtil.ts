import { useSyncExternalStore, type CSSProperties } from "react";
import type { IModuleSettings } from "../services/moduleSettings.types";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_PRIMARY,
  HEX_PATTERN,
  readableForeground,
} from "./colorUtils";

export const DEFAULT_MODULE_SETTINGS: IModuleSettings = {
  mode: "light",
  primary: DEFAULT_PRIMARY,
  background: DEFAULT_BACKGROUND,
};

export function settingsKey(moduleCode: string) {
  return `ml:${moduleCode}.settings`;
}

const cache = new Map<string, IModuleSettings>();
const listeners = new Set<() => void>();

function load(storageKey: string): IModuleSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Partial<IModuleSettings> | null;
    return {
      mode: "light",
      primary: HEX_PATTERN.test(saved?.primary ?? "") ? saved!.primary! : DEFAULT_PRIMARY,
      background: saved?.background?.startsWith("linear-gradient(") ? saved.background : DEFAULT_BACKGROUND,
    };
  } catch {
    return DEFAULT_MODULE_SETTINGS;
  }
}

export function readModuleSettings(storageKey: string): IModuleSettings {
  let settings = cache.get(storageKey);
  if (!settings) {
    settings = load(storageKey);
    cache.set(storageKey, settings);
  }
  return settings;
}

function write(storageKey: string, settings: IModuleSettings) {
  cache.set(storageKey, settings);
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // storage blocked: the choice still applies for this session
  }
  applyModuleTheme(settings);
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function useModuleSettings(storageKey: string): IModuleSettings {
  return useSyncExternalStore(
    subscribe,
    () => readModuleSettings(storageKey),
    () => readModuleSettings(storageKey),
  );
}

export function updateModuleSettings(storageKey: string, patch: Partial<IModuleSettings>) {
  write(storageKey, { ...readModuleSettings(storageKey), ...patch });
}

export function resetModuleSettings(storageKey: string) {
  write(storageKey, DEFAULT_MODULE_SETTINGS);
}

/** theme.css stays the default; only a different choice is set inline on <html>. */
export function applyModuleTheme(settings: IModuleSettings) {
  const style = document.documentElement.style;
  if (settings?.primary?.toLowerCase() === DEFAULT_PRIMARY) {
    style.removeProperty("--primary");
    style.removeProperty("--primary-foreground");
  } else {
    style.setProperty("--primary", settings.primary);
    style.setProperty("--primary-foreground", readableForeground(settings.primary));
  }
  if (settings?.background === DEFAULT_BACKGROUND) style.removeProperty("--module-backdrop");
  else style.setProperty("--module-backdrop", settings.background);
}

export function isDefaultModuleSettings(settings: IModuleSettings) {
  return (
    settings?.primary?.toLowerCase() === DEFAULT_PRIMARY &&
    settings?.background === DEFAULT_BACKGROUND
  );
}

/** The same variables theme.css derives from --primary, for scoping an unsaved theme to one element. */
export function themeScopeStyle(settings: IModuleSettings): CSSProperties {
  const primary = settings?.primary ?? DEFAULT_PRIMARY;
  return {
    "--primary": primary,
    "--primary-foreground": readableForeground(primary),
    "--ring": primary,
    "--sidebar-primary": primary,
    "--sidebar-ring": primary,
    "--sidebar-accent": `color-mix(in oklab, ${primary} 10%, var(--background))`,
    "--sidebar-accent-foreground": primary,
    "--module-backdrop": settings?.background ?? DEFAULT_BACKGROUND,
  } as CSSProperties;
}

