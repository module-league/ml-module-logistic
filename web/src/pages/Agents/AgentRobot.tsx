import { cn } from "@moduleleague/ui";
import type { RobotStatus } from "./agentCanvas.utils";
import styles from "./AgentRobot.module.css";

const STATUS_COLOR: Record<RobotStatus, string> = {
  working: "text-primary",
  waiting: "text-amber-500 dark:text-amber-400",
  watching: "text-muted-foreground",
};

interface AgentRobotProps {
  status: RobotStatus;
  className?: string;
}

/** The robot drawn for an agent; how it moves shows what it's doing. Motion stops for reduced-motion users. */
export function AgentRobot({ status, className }: AgentRobotProps) {
  return (
    <svg
      viewBox="0 0 72 72"
      aria-hidden
      className={cn(
        styles.robot,
        styles[status],
        STATUS_COLOR[status],
        className,
      )}
    >
      <line
        x1="36"
        y1="7"
        x2="36"
        y2="14"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        className={styles.light}
        cx="36"
        cy="5"
        r="3.5"
        fill="currentColor"
      />
      <rect
        x="15"
        y="14"
        width="42"
        height="27"
        rx="9"
        className="fill-background"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <g className={styles.eyes}>
        <circle
          className={styles.eye}
          cx="28"
          cy="26"
          r="3.5"
          fill="currentColor"
        />
        <circle
          className={styles.eye}
          cx="44"
          cy="26"
          r="3.5"
          fill="currentColor"
        />
      </g>
      <rect
        x="30"
        y="33"
        width="12"
        height="2.5"
        rx="1.25"
        fill="currentColor"
      />
      <rect
        x="12"
        y="45"
        width="7"
        height="15"
        rx="3.5"
        fill="currentColor"
        opacity="0.6"
      />
      <rect
        className={styles.arm}
        x="53"
        y="45"
        width="7"
        height="15"
        rx="3.5"
        fill="currentColor"
        opacity="0.6"
      />
      <rect
        x="21"
        y="43"
        width="30"
        height="22"
        rx="7"
        className="fill-background"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle
        className={styles.light}
        cx="36"
        cy="54"
        r="3"
        fill="currentColor"
      />
    </svg>
  );
}
