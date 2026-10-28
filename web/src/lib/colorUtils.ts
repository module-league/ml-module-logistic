import type { PrimaryPreset } from "@/module/settings/moduleSettings.types";

/**
 * Generate random deep color and return as hex string format
 *
 * use for background with white/light font color
 */
export function getRandomDeepColor() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 100);
  const l = Math.floor(Math.random() * 60);
  // Lightness is capped at 60 of 100 so the colour stays dark enough for light text on top
  return hslToHex(h, s, l);

  function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0"); // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}

/** Calculate the contrast color of given color hex code */
export function getContrastColor(hexString: string) {
  const red = parseInt(hexString.slice(1, 3), 16),
    green = parseInt(hexString.slice(3, 5), 16),
    blue = parseInt(hexString.slice(5, 7), 16);

  if (red * 0.299 + green * 0.587 + blue * 0.114 > 186) return "#000000";
  else return "#ffffff";
}

export const presetColors = [
  "#047857", // bg-emerald-700
  "#0369A1", // bg-sky-700
  "#7350A5", // custom
  "#475569", // bg-slate-600
  "#F43F5E", // bg-rose-500
  "#EA580C", // bg-orange-600
  "#FACC15", // bg-yellow-400
  "#06B6D4", // bg-cyan-700
];

export const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const DEFAULT_PRIMARY = "#1d4ed8";

export const DEFAULT_BACKGROUND =
  "linear-gradient(180deg, #c6d8e2 0%, #d6e2ea 15%, #e2dae0 30%, #e8ccd7 45%, #ebc1da 65%, #c3bbd8 85%, #a6bcd6 100%)";

export const PRIMARY_PRESETS: PrimaryPreset[] = [
  { name: "Blue", primary: DEFAULT_PRIMARY, background: DEFAULT_BACKGROUND },
  {
    name: "Indigo",
    primary: "#4338ca",
    background:
      "linear-gradient(180deg, #d9def3 0%, #e4dcef 35%, #ecd3e6 65%, #c7c9ea 100%)",
  },
  {
    name: "Violet",
    primary: "#6d28d9",
    background:
      "linear-gradient(180deg, #e6dcf3 0%, #efd3ea 35%, #f2c9de 65%, #cfc3ea 100%)",
  },
  {
    name: "Teal",
    primary: "#0f766e",
    background:
      "linear-gradient(180deg, #cfe6e6 0%, #dfe3ea 35%, #ebd6e0 65%, #b9d3dc 100%)",
  },
  {
    name: "Emerald",
    primary: "#047857",
    background:
      "linear-gradient(180deg, #d3eadf 0%, #e2e4e3 35%, #eed7df 65%, #bfd8d8 100%)",
  },
  {
    name: "Amber",
    primary: "#b45309",
    background:
      "linear-gradient(180deg, #f6e3cf 0%, #f3d6d6 35%, #ebcde0 65%, #c9c8e0 100%)",
  },
  {
    name: "Rose",
    primary: "#be123c",
    background:
      "linear-gradient(180deg, #f8d9e0 0%, #f1cde0 35%, #e2c6e3 65%, #bcc6e3 100%)",
  },
  {
    name: "Slate",
    primary: "#334155",
    background:
      "linear-gradient(180deg, #d9dee5 0%, #e2dde3 35%, #e5d6de 65%, #bcc5d4 100%)",
  },
];

/** White or near-black text, whichever reads better on the colour. */
export function readableForeground(hex: string): string {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
}
