import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import type { AgentDefinition, AgentId, AgentStep } from "./agents.types";

/** The canvas is laid out in its own coordinate space (px at 100% zoom) and scaled as a whole. */
export const CANVAS = {
  width: 1700,
  height: 1140,
  stationWidth: 300,
  /** Where connectors meet a station: level with the robot. */
  anchorY: 56,
} as const;

const COLUMN_X = [40, 480, 920, 1360] as const;
const ROW_Y = [80, 600] as const;

/** Stations sit in the stage of the shipment's life where their trigger happens. */
export const LANES = [
  { title: "Booked", x: COLUMN_X[0] },
  { title: "Planned", x: COLUMN_X[1] },
  { title: "On the road", x: COLUMN_X[2] },
  { title: "Delivered & billed", x: COLUMN_X[3] },
] as const;

export const STATION_POSITION: Record<AgentId, { x: number; y: number }> = {
  booking_intake: { x: COLUMN_X[0], y: ROW_Y[0] },
  dispatch_planner: { x: COLUMN_X[1], y: ROW_Y[0] },
  document_review: { x: COLUMN_X[1], y: ROW_Y[1] },
  exception_copilot: { x: COLUMN_X[2], y: ROW_Y[0] },
  customer_update: { x: COLUMN_X[3], y: ROW_Y[0] },
  billing_audit: { x: COLUMN_X[3], y: ROW_Y[1] },
};

export interface AgentConnection {
  from: AgentId;
  to: AgentId;
  /** The change in the shipment data that wakes the next agent; agents never call each other. */
  label: string;
}

export const CONNECTIONS: readonly AgentConnection[] = [
  { from: "booking_intake", to: "dispatch_planner", label: "Shipment created" },
  { from: "booking_intake", to: "document_review", label: "Papers uploaded" },
  {
    from: "dispatch_planner",
    to: "exception_copilot",
    label: "Running late → rule opens exception",
  },
  {
    from: "exception_copilot",
    to: "customer_update",
    label: "Customer-facing exception",
  },
  {
    from: "exception_copilot",
    to: "billing_audit",
    label: "Waiting time, failed attempts",
  },
  { from: "document_review", to: "billing_audit", label: "POD verified" },
];

/** A curve from the right edge of one station to the left edge of the next, with its midpoint for the label. */
export function connectorPath({ from, to }: AgentConnection) {
  const start = {
    x: STATION_POSITION[from].x + CANVAS.stationWidth,
    y: STATION_POSITION[from].y + CANVAS.anchorY,
  };
  const end = {
    x: STATION_POSITION[to].x,
    y: STATION_POSITION[to].y + CANVAS.anchorY,
  };
  const bend = (end.x - start.x) / 2;
  return {
    d: `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`,
    midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

export type RobotActivity =
  | { status: "working"; stepIndex: number; step: AgentStep }
  | { status: "waiting" }
  | { status: "watching" };

export type RobotStatus = RobotActivity["status"];

export const STATUS_LABEL: Record<RobotStatus, string> = {
  working: "Working",
  waiting: "Waiting for you",
  watching: "Watching",
};

export const STATUS_CLASS: Record<RobotStatus, string> = {
  working: "border-primary-30 bg-primary-10 text-primary",
  waiting: TONE_CLASS.amber,
  watching: "bg-muted text-muted-foreground",
};

/** Ticks a robot waits for approval, then watches for its next trigger, before its run starts over. */
const WAITING_TICKS = 2;
const WATCHING_TICKS = 2;

/**
 * What a robot is doing at a tick of the demo clock: working through its steps, waiting for a person, or watching.
 * Each robot starts at its own offset so they don't move in step.
 * @example
 * robotActivity(agent, tick, index * 3).status; // "working"
 */
export function robotActivity(
  agent: AgentDefinition,
  tick: number,
  offset: number,
): RobotActivity {
  const { steps } = agent.scenario;
  const position =
    (tick + offset) % (steps.length + WAITING_TICKS + WATCHING_TICKS);
  const step = steps[position];
  if (step) return { status: "working", stepIndex: position, step };
  return position < steps.length + WAITING_TICKS
    ? { status: "waiting" }
    : { status: "watching" };
}

/**
 * A counter that goes up every interval while playing; the robots' work is worked out from it.
 * @example
 * const tick = useDemoClock(isPlaying, 1800);
 */
export function useDemoClock(isPlaying: boolean, intervalMs: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(
      () => setTick((current) => current + 1),
      intervalMs,
    );
    return () => clearInterval(timer);
  }, [isPlaying, intervalMs]);
  return tick;
}

/**
 * Drag the empty canvas with the mouse to scroll it, like a design tool. Stations stay clickable; touch scrolls natively.
 * @example
 * const { ref, isPanning, panHandlers } = useDragToPan<HTMLDivElement>();
 * <div ref={ref} {...panHandlers} className="overflow-auto" />
 */
export function useDragToPan<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const start = useRef<{ x: number; y: number; left: number; top: number }>(
    null,
  );
  const [isPanning, setIsPanning] = useState(false);

  const onPointerDown = useCallback((event: PointerEvent<T>) => {
    const viewport = ref.current;
    const onStation =
      event.target instanceof Element &&
      event.target.closest("article, button") !== null;
    if (viewport === null || event.pointerType !== "mouse" || onStation) return;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }, []);
  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    const viewport = ref.current;
    if (viewport === null || start.current === null) return;
    viewport.scrollLeft =
      start.current.left - (event.clientX - start.current.x);
    viewport.scrollTop = start.current.top - (event.clientY - start.current.y);
  }, []);
  const onPointerEnd = useCallback(() => {
    start.current = null;
    setIsPanning(false);
  }, []);

  return {
    ref,
    isPanning,
    panHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
