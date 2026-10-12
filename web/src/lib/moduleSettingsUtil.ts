import { useSyncExternalStore, type CSSProperties } from "react";
import type {
  IModuleSettings,
  PrimaryPreset,
} from "../services/moduleSettings.types";

export const DEFAULT_PRIMARY = "#1d4ed8";

export const DEFAULT_BACKGROUND =
  "linear-gradient(180deg, #c6d8e2 0%, #d6e2ea 15%, #e2dae0 30%, #e8ccd7 45%, #ebc1da 65%, #c3bbd8 85%, #a6bcd6 100%)";

export const PRIMARY_PRESETS: PrimaryPreset[] = [
  { name: "Blue", primary: DEFAULT_PRIMARY, background: DEFAULT_BACKGROUND },
  {
    name: "Indigo",
    primary: "#4338ca",
    background: "linear-gradient(180deg, #d9def3 0%, #e4dcef 35%, #ecd3e6 65%, #c7c9ea 100%)",
  },
  {
    name: "Violet",
    primary: "#6d28d9",
    background: "linear-gradient(180deg, #e6dcf3 0%, #efd3ea 35%, #f2c9de 65%, #cfc3ea 100%)",
  },
  {
    name: "Teal",
    primary: "#0f766e",
    background: "linear-gradient(180deg, #cfe6e6 0%, #dfe3ea 35%, #ebd6e0 65%, #b9d3dc 100%)",
  },
  {
    name: "Emerald",
    primary: "#047857",
    background: "linear-gradient(180deg, #d3eadf 0%, #e2e4e3 35%, #eed7df 65%, #bfd8d8 100%)",
  },
  {
    name: "Amber",
    primary: "#b45309",
    background: "linear-gradient(180deg, #f6e3cf 0%, #f3d6d6 35%, #ebcde0 65%, #c9c8e0 100%)",
  },
  {
    name: "Rose",
    primary: "#be123c",
    background: "linear-gradient(180deg, #f8d9e0 0%, #f1cde0 35%, #e2c6e3 65%, #bcc6e3 100%)",
  },
  {
    name: "Slate",
    primary: "#334155",
    background: "linear-gradient(180deg, #d9dee5 0%, #e2dde3 35%, #e5d6de 65%, #bcc5d4 100%)",
  },
];

export const DEFAULT_MODULE_SETTINGS: IModuleSettings = {
  mode: "light",
  primary: DEFAULT_PRIMARY,
  background: DEFAULT_BACKGROUND,
};

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

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

/** White or near-black text, whichever reads better on the colour. */
export function readableForeground(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
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

