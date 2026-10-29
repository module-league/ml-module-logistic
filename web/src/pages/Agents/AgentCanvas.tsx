import { useState } from "react";
import { Pause, Play, ZoomIn, ZoomOut } from "lucide-react";
import { Button, cn } from "@moduleleague/ui";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { AgentStation } from "./AgentStation";
import {
  CANVAS,
  CONNECTIONS,
  connectorPath,
  LANES,
  robotActivity,
  STATION_POSITION,
  STATUS_CLASS,
  STATUS_LABEL,
  useDemoClock,
  useDragToPan,
  type RobotStatus,
} from "./agentCanvas.utils";
import type { AgentDefinition, AgentId } from "./agents.types";
import styles from "./AgentCanvas.module.css";

const TICK_MS = 1800;
/** Robots start this many ticks apart so they don't move in step. */
const START_GAP = 3;
const ZOOM_LEVELS = [0.5, 0.65, 0.8, 1] as const;
const DEFAULT_ZOOM_INDEX = 2;
const STATUSES: readonly RobotStatus[] = ["working", "waiting", "watching"];

interface AgentCanvasProps {
  agents: readonly AgentDefinition[];
  selectedId: AgentId;
  onSelect: (agentId: AgentId) => void;
}

/** Every agent as a robot on a design canvas, laid out by shipment stage and linked by the data that wakes the next one. */
export function AgentCanvas({
  agents,
  selectedId,
  onSelect,
}: AgentCanvasProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const {
    ref: viewportRef,
    isPanning,
    panHandlers,
  } = useDragToPan<HTMLDivElement>();
  const tick = useDemoClock(isPlaying, TICK_MS);
  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;

  const stations = agents.map((agent, index) => ({
    agent,
    activity: robotActivity(agent, tick, index * START_GAP),
  }));
  const linked = new Set(
    CONNECTIONS.filter(
      (connection) =>
        connection.from === selectedId || connection.to === selectedId,
    ).flatMap((connection) => [connection.from, connection.to]),
  );

  return (
    <section
      aria-label="Agent canvas"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {STATUSES.map((status) => (
            <span key={status} className={cn(CHIP_CLASS, STATUS_CLASS[status])}>
              {
                stations.filter(({ activity }) => activity.status === status)
                  .length
              }{" "}
              {STATUS_LABEL[status].toLowerCase()}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            startIcon={isPlaying ? <Pause size={12} /> : <Play size={12} />}
            onClick={() => setIsPlaying((current) => !current)}
          >
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="Zoom out"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((current) => current - 1)}
          >
            <ZoomOut size={12} />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="Zoom in"
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            onClick={() => setZoomIndex((current) => current + 1)}
          >
            <ZoomIn size={12} />
          </Button>
        </div>
      </div>

      <div
        ref={viewportRef}
        {...panHandlers}
        className={cn(
          "h-[70dvh] overflow-auto",
          styles.viewport,
          isPanning && styles.panning,
          !isPlaying && styles.paused,
        )}
      >
        <div
          style={{ width: CANVAS.width * zoom, height: CANVAS.height * zoom }}
        >
          <div
            className={styles.board}
            style={{
              width: CANVAS.width,
              height: CANVAS.height,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {LANES.map((lane) => (
              <div
                key={lane.title}
                className="absolute rounded-2xl border border-dashed border-foreground/15"
                style={{
                  left: lane.x - 20,
                  top: 20,
                  width: CANVAS.stationWidth + 40,
                  height: CANVAS.height - 40,
                }}
              >
                <span className="absolute top-2 left-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {lane.title}
                </span>
              </div>
            ))}

            <Connectors selectedId={selectedId} />

            {stations.map(({ agent, activity }) => (
              <div
                key={agent.id}
                className="absolute"
                style={{
                  left: STATION_POSITION[agent.id].x,
                  top: STATION_POSITION[agent.id].y,
                  width: CANVAS.stationWidth,
                }}
              >
                <AgentStation
                  agent={agent}
                  activity={activity}
                  isSelected={agent.id === selectedId}
                  isDimmed={agent.id !== selectedId && !linked.has(agent.id)}
                  onSelect={() => onSelect(agent.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The links between agents, with the data change that carries each one; the selected agent's links are highlighted. */
function Connectors({ selectedId }: { selectedId: AgentId }) {
  const paths = CONNECTIONS.map((connection) => ({
    connection,
    path: connectorPath(connection),
    isActive: connection.from === selectedId || connection.to === selectedId,
  }));
  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        width={CANVAS.width}
        height={CANVAS.height}
      >
        <defs>
          <marker
            id="agent-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
          </marker>
        </defs>
        {paths.map(({ connection, path, isActive }) => (
          <path
            key={`${connection.from}-${connection.to}`}
            d={path.d}
            fill="none"
            strokeWidth={isActive ? 2.5 : 1.5}
            markerEnd="url(#agent-arrow)"
            className={cn(
              styles.flow,
              isActive ? "stroke-primary" : "stroke-primary-30",
            )}
          />
        ))}
      </svg>
      {paths.map(({ connection, path, isActive }) => (
        <span
          key={`${connection.from}-${connection.to}`}
          className={cn(
            "absolute max-w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background px-2 py-0.5 text-center text-[11px] shadow-sm",
            isActive ? "border-primary text-primary" : "text-muted-foreground",
          )}
          style={{ left: path.midpoint.x, top: path.midpoint.y }}
        >
          {connection.label}
        </span>
      ))}
    </>
  );
}
