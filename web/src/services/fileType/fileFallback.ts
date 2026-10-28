/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FallbackCategory =
  | "pdf"
  | "image"
  | "word"
  | "excel"
  | "ppt"
  | "text"
  | "csv"
  | "zip"
  | "audio"
  | "mp4"
  | "default";

export interface FallbackVisualSpec {
  label: string;
  primaryColor: string;
  bgSurface: string;
  borderStroke: string;
  /** Lowercase, without the dot. */
  extensions: string[];
  /** MIME types, or the start of one, e.g. "image/". */
  fileTypes: string[];
}

export const FALLBACK_SPECS: Record<FallbackCategory, FallbackVisualSpec> = {
  pdf: {
    label: "PDF",
    primaryColor: "#ef4444",
    bgSurface: "rgba(239, 68, 68, 0.08)",
    borderStroke: "rgba(239, 68, 68, 0.25)",
    extensions: ["pdf"],
    fileTypes: ["application/pdf"],
  },
  word: {
    label: "DOC",
    primaryColor: "#2563eb",
    bgSurface: "rgba(37, 99, 235, 0.08)",
    borderStroke: "rgba(37, 99, 235, 0.25)",
    extensions: ["doc", "docx", "dotx", "odt", "rtf"],
    fileTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml",
      "application/vnd.oasis.opendocument.text",
    ],
  },
  excel: {
    label: "SHEET",
    primaryColor: "#10b981",
    bgSurface: "rgba(16, 185, 129, 0.08)",
    borderStroke: "rgba(16, 185, 129, 0.25)",
    extensions: ["xls", "xlsx", "xlsm", "ods", "numbers"],
    fileTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml",
      "application/vnd.oasis.opendocument.spreadsheet",
    ],
  },
  ppt: {
    label: "SLIDE",
    primaryColor: "#f97316",
    bgSurface: "rgba(249, 115, 22, 0.08)",
    borderStroke: "rgba(249, 115, 22, 0.25)",
    extensions: ["ppt", "pptx", "potx", "odp", "key"],
    fileTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml",
      "application/vnd.oasis.opendocument.presentation",
    ],
  },
  image: {
    label: "IMG",
    primaryColor: "#8b5cf6",
    bgSurface: "rgba(139, 92, 246, 0.08)",
    borderStroke: "rgba(139, 92, 246, 0.25)",
    extensions: ["png", "jpg", "jpeg", "webp", "svg", "gif", "avif", "tiff"],
    fileTypes: ["image/"],
  },
  text: {
    label: "TXT",
    primaryColor: "#94a3b8",
    bgSurface: "rgba(148, 163, 184, 0.08)",
    borderStroke: "rgba(148, 163, 184, 0.25)",
    extensions: ["txt", "md", "log", "json", "xml", "yaml", "yml"],
    fileTypes: [
      "text/plain",
      "text/markdown",
      "text/xml",
      "application/json",
      "application/xml",
    ],
  },
  csv: {
    label: "CSV",
    primaryColor: "#06b6d4",
    bgSurface: "rgba(6, 182, 212, 0.08)",
    borderStroke: "rgba(6, 182, 212, 0.25)",
    extensions: ["csv", "tsv"],
    fileTypes: ["text/csv", "application/csv", "text/tab-separated-values"],
  },
  zip: {
    label: "ZIP",
    primaryColor: "#d97706",
    bgSurface: "rgba(217, 119, 6, 0.08)",
    borderStroke: "rgba(217, 119, 6, 0.25)",
    extensions: ["zip", "tar", "gz", "7z", "rar", "bz2"],
    fileTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-tar",
      "application/gzip",
      "application/x-7z-compressed",
      "application/vnd.rar",
    ],
  },
  audio: {
    label: "AUDIO",
    primaryColor: "#f43f5e",
    bgSurface: "rgba(244, 63, 94, 0.08)",
    borderStroke: "rgba(244, 63, 94, 0.25)",
    extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac"],
    fileTypes: ["audio/"],
  },
  mp4: {
    label: "MP4",
    primaryColor: "#0ea5e9",
    bgSurface: "rgba(14, 165, 233, 0.08)",
    borderStroke: "rgba(14, 165, 233, 0.25)",
    extensions: ["mp4", "mov", "webm", "mkv", "avi"],
    fileTypes: ["video/"],
  },
  default: {
    label: "FILE",
    primaryColor: "#64748b",
    bgSurface: "rgba(100, 116, 139, 0.08)",
    borderStroke: "rgba(100, 116, 139, 0.25)",
    extensions: [],
    fileTypes: [],
  },
};

const CATEGORIES = Object.keys(FALLBACK_SPECS) as FallbackCategory[];

/** Which icon a file gets: by its extension first, then by its MIME type. */
export function fileCategory(fileType = "", extension = ""): FallbackCategory {
  const lowered = extension.toLowerCase();
  return (
    CATEGORIES.find((category) =>
      FALLBACK_SPECS[category].extensions.includes(lowered),
    ) ??
    CATEGORIES.find((category) =>
      FALLBACK_SPECS[category].fileTypes.some((type) =>
        fileType.startsWith(type),
      ),
    ) ??
    "default"
  );
}
