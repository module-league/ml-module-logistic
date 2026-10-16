import { useCallback, useMemo, useState } from "react";
import { useDashboard } from "../dashboard.context";
import { pointOf, recordTitle, titleFieldOf } from "../moduleDashboard.utils";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";
import {
  DashboardWidgetFrame,
  DashboardWidgetMessage,
} from "./DashboardWidgetFrame";

const TILE = 256;
const PADDING = 32;
const MAX_ZOOM = 12;

/** A latitude and longitude in Web Mercator pixels at a zoom level. */
function toPixels(
  [lat, lng]: [number, number],
  zoom: number,
): [number, number] {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [
    ((lng + 180) / 360) * scale,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  ];
}

/** The highest zoom at which every point fits inside the box, with padding. */
function fitZoom(points: [number, number][], width: number, height: number) {
  for (let zoom = MAX_ZOOM; zoom > 1; zoom--) {
    const pixels = points.map((point) => toPixels(point, zoom));
    const xs = pixels.map(([x]) => x);
    const ys = pixels.map(([, y]) => y);
    if (
      Math.max(...xs) - Math.min(...xs) <= width - PADDING * 2 &&
      Math.max(...ys) - Math.min(...ys) <= height - PADDING * 2
    ) {
      return zoom;
    }
  }
  return 1;
}

/** Records as pins on an OpenStreetMap, with a route from each record's from point to its to point. */
export function MapWidget({ widget, view, compact }: DashboardWidgetBodyProps) {
  const { members, lookups, onOpenRecord } = useDashboard();
  const map = widget?.map;
  const titleField = titleFieldOf(view.fields, map?.titleFieldId);
  const height = compact ? 160 : 280;
  const [width, setWidth] = useState(0);
  // Re-fits the map whenever the widget is resized
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const placed = useMemo(
    () =>
      view.records.flatMap((record) => {
        const from = pointOf(record, map?.from, view.fieldById, lookups);
        if (!from) return [];
        return [
          {
            record,
            from,
            to: pointOf(record, map?.to, view.fieldById, lookups),
            title: recordTitle(record, titleField, members, lookups),
          },
        ];
      }),
    [
      view.records,
      map?.from,
      map?.to,
      view.fieldById,
      lookups,
      titleField,
      members,
    ],
  );

  const scene = useMemo(() => {
    if (!width || !placed.length) return undefined;
    const points = placed.flatMap((entry) =>
      entry.to ? [entry.from, entry.to] : [entry.from],
    );
    const zoom = points.length === 1 ? 10 : fitZoom(points, width, height);
    const pixels = points.map((point) => toPixels(point, zoom));
    const xs = pixels.map(([x]) => x);
    const ys = pixels.map(([, y]) => y);
    const left = (Math.min(...xs) + Math.max(...xs)) / 2 - width / 2;
    const top = (Math.min(...ys) + Math.max(...ys)) / 2 - height / 2;
    const count = 2 ** zoom;
    const tiles = [];
    for (
      let x = Math.floor(left / TILE);
      x <= Math.floor((left + width) / TILE);
      x++
    ) {
      for (
        let y = Math.floor(top / TILE);
        y <= Math.floor((top + height) / TILE);
        y++
      ) {
        if (y < 0 || y >= count) continue;
        tiles.push({
          key: `${x}/${y}`,
          src: `https://tile.openstreetmap.org/${zoom}/${((x % count) + count) % count}/${y}.png`,
          left: x * TILE - left,
          top: y * TILE - top,
        });
      }
    }
    const at = (point: [number, number]) => {
      const [x, y] = toPixels(point, zoom);
      return { x: x - left, y: y - top };
    };
    return {
      tiles,
      pins: placed.map((entry) => ({
        ...entry,
        start: at(entry.from),
        end: entry.to && at(entry.to),
      })),
    };
  }, [width, height, placed]);

  return (
    <DashboardWidgetFrame
      title={widget?.label}
      aside={
        widget?.caption ||
        `${placed.length} of ${view.records.length} on the map`
      }
    >
      {!map?.from?.latFieldId || !map?.from?.lngFieldId ? (
        <DashboardWidgetMessage>
          Pick the latitude and longitude fields in this widget's settings.
        </DashboardWidgetMessage>
      ) : (
        <div
          ref={measure}
          className="relative w-full overflow-hidden rounded-lg border bg-muted"
          style={{ height }}
        >
          {!placed.length && (
            <DashboardWidgetMessage>
              No records have a location yet.
            </DashboardWidgetMessage>
          )}
          {scene?.tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              draggable={false}
              className="absolute size-64 max-w-none select-none"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
          {scene && (
            <svg
              className="absolute inset-0 size-full"
              role="img"
              aria-label={`${placed.length} records on the map`}
            >
              {scene.pins.map(
                (pin) =>
                  pin.end && (
                    <line
                      key={`route-${pin.record.objId}`}
                      x1={pin.start.x}
                      y1={pin.start.y}
                      x2={pin.end.x}
                      y2={pin.end.y}
                      stroke="var(--dash-series-1)"
                      strokeWidth={2}
                      strokeOpacity={0.7}
                      strokeDasharray="6 4"
                    />
                  ),
              )}
              {scene.pins.map((pin) => (
                <g
                  key={pin.record.objId}
                  role="button"
                  tabIndex={compact ? undefined : 0}
                  aria-label={pin.title}
                  className={compact ? undefined : "cursor-pointer"}
                  onClick={
                    compact
                      ? undefined
                      : () => onOpenRecord(widget.sidebarId, pin.record.objId)
                  }
                  onKeyDown={(event) =>
                    event.key === "Enter" &&
                    !compact &&
                    onOpenRecord(widget.sidebarId, pin.record.objId)
                  }
                >
                  <title>{pin.title}</title>
                  {pin.end && (
                    <circle
                      cx={pin.end.x}
                      cy={pin.end.y}
                      r={5}
                      fill="white"
                      stroke="var(--dash-series-1)"
                      strokeWidth={2.5}
                    />
                  )}
                  <circle
                    cx={pin.start.x}
                    cy={pin.start.y}
                    r={12}
                    fill="transparent"
                  />
                  <circle
                    cx={pin.start.x}
                    cy={pin.start.y}
                    r={6}
                    fill="var(--dash-series-1)"
                    stroke="white"
                    strokeWidth={2}
                  />
                </g>
              ))}
            </svg>
          )}
          <span className="absolute right-1 bottom-1 rounded bg-background/80 px-1 text-[10px] text-muted-foreground">
            © OpenStreetMap contributors
          </span>
        </div>
      )}
    </DashboardWidgetFrame>
  );
}
