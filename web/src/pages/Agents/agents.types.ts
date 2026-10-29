import type { LucideIcon } from "lucide-react";

export type AgentId =
  | "document_review"
  | "exception_copilot"
  | "booking_intake"
  | "customer_update"
  | "billing_audit"
  | "dispatch_planner";

/** Rollout order: phase 1 builds on pages that already exist, later phases need new inputs (inbox, email). */
export type AgentPhase = 1 | 2 | 3;

/** How far an agent may go on its own. */
export type AgentAutonomy = "suggest" | "approve" | "auto";

/** One call the agent makes while it works, as the demo plays it back. */
export interface AgentStep {
  readonly title: string;
  /** The API call or model task, e.g. "GET /documents". */
  readonly tool: string;
  readonly result: string;
}

export type AgentCheckStatus = "match" | "mismatch" | "missing";

/** A value read from a document next to the shipment record's. */
export interface AgentFieldCheck {
  readonly field: string;
  readonly documentValue: string;
  readonly recordValue: string;
  readonly status: AgentCheckStatus;
  /** Where on the document the value was read, so a person can check it. */
  readonly source: string;
}

export type AgentOutput =
  | {
      readonly kind: "document_review";
      readonly documentType: string;
      /** 0–100. */
      readonly confidence: number;
      readonly checks: readonly AgentFieldCheck[];
      readonly verdict: string;
    }
  | {
      readonly kind: "draft";
      readonly findings: readonly string[];
      readonly draftTitle: string;
      readonly draft: string;
    };

/** One worked example the demo runs. */
export interface AgentScenario {
  /** What set it off, e.g. "packing-list-1042.pdf uploaded to SHP-1042". */
  readonly trigger: string;
  readonly steps: readonly AgentStep[];
  readonly output: AgentOutput;
  readonly approveLabel: string;
  readonly rejectLabel: string;
}

export interface AgentDefinition {
  readonly id: AgentId;
  readonly name: string;
  readonly icon: LucideIcon;
  readonly phase: AgentPhase;
  readonly summary: string;
  /** What it is answerable for, in the order it does them. */
  readonly responsibilities: readonly string[];
  /** The manual work it takes over. */
  readonly replaces: string;
  readonly trigger: string;
  readonly tools: readonly string[];
  readonly autonomy: AgentAutonomy;
  readonly guardrails: readonly string[];
  readonly scenario: AgentScenario;
}
