/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  FALLBACK_SPECS,
  fileCategory,
  type FallbackCategory,
} from "@/services/fileType/fileFallback";
import type { AttachmentTypeIconProps } from "./RecordAttachmentInput.types";

const SIZES = {
  xs: { box: 20, icon: 12, badge: 0 },
  sm: { box: 28, icon: 16, badge: 0 },
  md: { box: 40, icon: 22, badge: 9 },
  lg: { box: 56, icon: 30, badge: 10 },
  xl: { box: 80, icon: 42, badge: 11 },
  "2xl": { box: 112, icon: 58, badge: 11 },
};

const line = (x1: number, y1: number, x2: number, y2: number, width = 1.8) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={width} />
);
const dot = (cx: number, cy: number, r: number) => (
  <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);
const folio = (
  <>
    <path
      d="M16 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-4z"
      strokeWidth={1.8}
    />
    <path d="M14 3v4a1 1 0 0 0 1 1h4" strokeWidth={1.8} />
  </>
);

const MOTIFS: Record<FallbackCategory, ReactNode> = {
  pdf: (
    <>
      {folio}
      {line(9, 12, 15, 12, 1.6)}
      {line(9, 15, 13, 15, 1.6)}
    </>
  ),
  word: (
    <>
      {folio}
      {line(8.5, 11, 15.5, 11)}
      {line(8.5, 14, 14, 14, 1.6)}
      {line(8.5, 17, 12.5, 17, 1.6)}
    </>
  ),
  excel: (
    <>
      {folio}
      <rect x={8} y={11} width={8} height={6.5} rx={0.75} strokeWidth={1.3} />
      {line(12, 11, 12, 17.5, 1.3)}
      {line(8, 14, 16, 14, 1.3)}
    </>
  ),
  ppt: (
    <>
      {folio}
      <rect x={8} y={11.5} width={8} height={5.5} rx={1} strokeWidth={1.4} />
      {dot(10.5, 14.2, 1)}
      {line(12.5, 13.5, 14.5, 13.5, 1.2)}
      {line(12.5, 15, 14, 15, 1.2)}
    </>
  ),
  image: (
    <>
      <rect x={4} y={4} width={16} height={16} rx={3} strokeWidth={1.8} />
      {dot(9, 9, 1.8)}
      <path d="m20 15-4.5-4.5a1.2 1.2 0 0 0-1.7 0L7 17.5" strokeWidth={1.8} />
    </>
  ),
  text: (
    <>
      {folio}
      <path d="M10 11.5 8 13.5l2 2" strokeWidth={1.5} />
      <path d="M14 11.5l2 2-2 2" strokeWidth={1.5} />
    </>
  ),
  csv: (
    <>
      {folio}
      {line(8, 12, 10.5, 12)}
      {dot(12, 12, 0.75)}
      {line(13.5, 12, 16, 12)}
      {line(8, 15.5, 11.5, 15.5)}
      {dot(13, 15.5, 0.75)}
      {line(14.5, 15.5, 16, 15.5)}
    </>
  ),
  zip: (
    <>
      {folio}
      {line(12, 10, 12, 16.5, 1.5)}
      {line(10.5, 11, 12, 11, 1.5)}
      {line(12, 12.5, 13.5, 12.5, 1.5)}
      {line(10.5, 14, 12, 14, 1.5)}
      <rect
        x={10.8}
        y={16.2}
        width={2.4}
        height={2.6}
        rx={0.6}
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  audio: (
    <>
      {folio}
      {line(8, 13.5, 8, 14.5)}
      {line(10, 12, 10, 16)}
      {line(12, 10.5, 12, 17.5)}
      {line(14, 12, 14, 16)}
      {line(16, 13.5, 16, 14.5)}
    </>
  ),
  mp4: (
    <>
      <rect x={4} y={5} width={16} height={14} rx={2.5} strokeWidth={1.8} />
      {line(4, 9, 20, 9, 1.2)}
      {line(4, 15, 20, 15, 1.2)}
      {dot(7, 7, 0.8)}
      {dot(12, 7, 0.8)}
      {dot(17, 7, 0.8)}
      {dot(7, 17, 0.8)}
      {dot(12, 17, 0.8)}
      {dot(17, 17, 0.8)}
      <polygon
        points="10,10.5 15,12 10,13.5"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  default: (
    <>
      {folio}
      {dot(12, 13.5, 1.5)}
      {dot(9, 15.5, 1)}
      {dot(15, 15.5, 1)}
      {line(12, 13.5, 9, 15.5, 1.2)}
      {line(12, 13.5, 15, 15.5, 1.2)}
    </>
  ),
};

/**
 * A tinted tile for a file's type, picked from its MIME type and extension, with the extension as a badge from md up.
 * @example
 * <AttachmentTypeIcon attachment={attachment} size="lg" />
 */
export function AttachmentTypeIcon({
  attachment,
  size = "md",
  showBadge = true,
  className,
}: AttachmentTypeIconProps) {
  // The category only changes with the file's type or extension
  const category = useMemo(
    () => fileCategory(attachment?.fileType, attachment?.fileExtension),
    [attachment?.fileType, attachment?.fileExtension],
  );
  const spec = FALLBACK_SPECS[category];
  const { box, icon, badge } = SIZES[size] ?? SIZES.md;
  const label = (attachment?.fileExtension || spec?.label)
    ?.toUpperCase()
    .slice(0, 5);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-[28%] border select-none",
        className,
      )}
      style={{
        width: box,
        height: box,
        color: spec?.primaryColor,
        backgroundColor: spec?.bgSurface,
        borderColor: spec?.borderStroke,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={icon}
        height={icon}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {MOTIFS[category]}
      </svg>
      {showBadge && !!badge && (
        <span
          className="absolute -right-1 -bottom-1 rounded px-1 py-0.5 font-mono leading-none font-semibold tracking-wider text-white shadow-xs"
          style={{ backgroundColor: spec?.primaryColor, fontSize: badge }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
