// Prototype only: every agent, shipment and value below is dummy data. Nothing here calls the API or a model.
import {
  CalendarClock,
  FileSearch,
  Inbox,
  MessageSquareText,
  ReceiptText,
  Siren,
} from "lucide-react";
import type {
  AgentAutonomy,
  AgentDefinition,
  AgentPhase,
} from "./agents.types";

export const AUTONOMY: Record<
  AgentAutonomy,
  { label: string; description: string }
> = {
  suggest: {
    label: "Suggests only",
    description: "Shows its findings; a person does the action.",
  },
  approve: {
    label: "Acts after approval",
    description: "Prepares the change; it runs when a person approves it.",
  },
  auto: {
    label: "Acts alone (low risk)",
    description:
      "Does easy-to-undo work itself, such as notes; anything else waits for a person.",
  },
};

export const PHASES: Record<
  AgentPhase,
  { label: string; description: string }
> = {
  1: {
    label: "Phase 1",
    description: "Builds on the Documents and Exceptions pages as they are.",
  },
  2: {
    label: "Phase 2",
    description: "Needs a bookings inbox and outgoing email.",
  },
  3: {
    label: "Phase 3",
    description: "Touches money and plans, so it follows trust earned in 1–2.",
  },
};

/** The loop every agent runs, whatever its job. */
export const AGENT_LOOP = [
  {
    title: "Trigger",
    text: "An event already in the system: an upload, a rule, an email, a schedule.",
  },
  {
    title: "Gather",
    text: "Reads the shipment, dispatch, documents and timeline through the API.",
  },
  {
    title: "Reason",
    text: "The model compares, extracts and decides what matters.",
  },
  {
    title: "Draft",
    text: "Findings, a suggested action and any message, with sources.",
  },
  {
    title: "Decide",
    text: "A person approves or rejects, unless the action is low risk.",
  },
  { title: "Log", text: "Every step lands on the timeline as “AI assistant”." },
] as const;

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: "document_review",
    name: "Document review",
    icon: FileSearch,
    phase: 1,
    summary:
      "Reads each file uploaded to a shipment, works out what it is and checks it against the shipment record.",
    responsibilities: [
      "Work out what each uploaded file is by reading it, not its file name.",
      "Pull out parties, weights, package count, reference numbers, HS codes and dates.",
      "Compare every value with the shipment record and flag differences over tolerance.",
      "Check expiry dates, and that a POD is signed and stamped.",
      "Hand its verdict to a person to verify or reject.",
    ],
    replaces:
      "Opening every PDF, picking its type and comparing weights, parties and numbers by eye.",
    trigger:
      "A file is uploaded to a shipment's checklist on the Documents page.",
    tools: [
      "GET /documents",
      "GET /sidebars/{shipment}/records/{id}",
      "Model: read the file",
      "POST /documents/{id}/verify (after approval)",
    ],
    autonomy: "suggest",
    guardrails: [
      "Every value cites the page and spot it was read from.",
      "Below 80% confidence it only says “needs a person”.",
      "Never verifies or rejects by itself.",
    ],
    scenario: {
      trigger:
        "packing-list-1042.pdf uploaded to SHP-1042 · Shah Alam → Bayan Lepas",
      steps: [
        {
          title: "Load the shipment's checklist",
          tool: "GET /documents",
          result:
            "SHP-1042 needs a commercial invoice, packing list and consignment note; the packing list is missing.",
        },
        {
          title: "Load the shipment record",
          tool: "GET /sidebars/shipment/records/SHP-1042",
          result:
            "Shipper Acme Precision Parts, consignee Lumen Assembly, 24 packages, 1,180 kg.",
        },
        {
          title: "Read the uploaded file",
          tool: "Model: read packing-list-1042.pdf",
          result:
            "2 pages; header reads “PACKING LIST”; a table of 24 cartons.",
        },
        {
          title: "Classify and extract",
          tool: "Model: classify + extract fields",
          result: "Packing list (96% sure); 6 fields extracted.",
        },
        {
          title: "Compare with the record",
          tool: "Model: compare against SHP-1042",
          result: "4 match, 1 differs, 1 missing on the record.",
        },
      ],
      output: {
        kind: "document_review",
        documentType: "Packing list",
        confidence: 96,
        verdict:
          "This is the packing list for SHP-1042, but its gross weight is 5.1% above the record — over the 5% tolerance. Check the weight before verifying.",
        checks: [
          {
            field: "Shipper",
            documentValue: "Acme Precision Parts Sdn Bhd",
            recordValue: "Acme Precision Parts",
            status: "match",
            source: "Page 1 · header",
          },
          {
            field: "Consignee",
            documentValue: "Lumen Assembly, Bayan Lepas",
            recordValue: "Lumen Assembly",
            status: "match",
            source: "Page 1 · ship-to box",
          },
          {
            field: "Packages",
            documentValue: "24 cartons",
            recordValue: "24",
            status: "match",
            source: "Page 2 · totals row",
          },
          {
            field: "Gross weight",
            documentValue: "1,240 kg",
            recordValue: "1,180 kg",
            status: "mismatch",
            source: "Page 2 · totals row",
          },
          {
            field: "Consignment note no.",
            documentValue: "CN-88213",
            recordValue: "CN-88213",
            status: "match",
            source: "Page 1 · reference",
          },
          {
            field: "HS code",
            documentValue: "8542.31",
            recordValue: "—",
            status: "missing",
            source: "Page 2 · line 1",
          },
        ],
      },
      approveLabel: "Verify document",
      rejectLabel: "Reject: weight differs",
    },
  },
  {
    id: "exception_copilot",
    name: "Exception co-pilot",
    icon: Siren,
    phase: 1,
    summary:
      "When a rule opens an exception, gathers everything about the shipment and writes what happened and what to do.",
    responsibilities: [
      "Gather the shipment, dispatch, checkpoints and documents behind each new exception.",
      "Explain in plain words what happened and why.",
      "Estimate a new arrival time when a shipment is late.",
      "Suggest the fix and the resolution reason.",
      "Post its summary on the exception timeline.",
    ],
    replaces:
      "Clicking through the shipment, dispatch, checkpoints and documents to understand one exception.",
    trigger:
      "The rule engine opens an exception (every minute, or right after a change).",
    tools: [
      "GET /exceptions",
      "GET /dispatches/{id}/checkpoints",
      "GET /sidebars/{location}/records",
      "POST /exceptions/{id}/activity",
    ],
    autonomy: "auto",
    guardrails: [
      "Posts its summary as a timeline note by itself.",
      "Fixes and customer messages wait for a person.",
      "Never resolves an exception.",
    ],
    scenario: {
      trigger:
        "EXC-0031 “Delayed” opened by rule for SHP-1038 · Port Klang → Ipoh",
      steps: [
        {
          title: "Load the exception",
          tool: "GET /exceptions",
          result:
            "Delayed, high; planned delivery 14:00 today; respond within 1 h.",
        },
        {
          title: "Load the dispatch's checkpoints",
          tool: "GET /dispatches/DSP-0207/checkpoints",
          result:
            "Last checkpoint 12:10 at Rawang toll, note “jam after accident”.",
        },
        {
          title: "Check the receiver's hours",
          tool: "GET /sidebars/location/records",
          result: "Ipoh warehouse is open until 18:00.",
        },
        {
          title: "Estimate a new arrival",
          tool: "Model: route + traffic note",
          result: "About 16:30, still inside opening hours.",
        },
        {
          title: "Post the summary",
          tool: "POST /exceptions/EXC-0031/activity",
          result: "Note added to the timeline as “AI assistant”.",
        },
      ],
      output: {
        kind: "draft",
        findings: [
          "Stuck in traffic near Rawang since 12:10 after an accident; not a driver or vehicle problem.",
          "New arrival about 16:30 — the receiver is open until 18:00, so no redelivery needed.",
          "Suggested fix: update the ETA to 16:30 and tell the consignee.",
        ],
        draftTitle: "Draft message to the consignee",
        draft:
          "Hello Ipoh team, shipment SHP-1038 is delayed by traffic after an accident near Rawang. New arrival is about 16:30 today, within your opening hours. We'll update you if this changes.",
      },
      approveLabel: "Update ETA and send",
      rejectLabel: "Discard draft",
    },
  },
  {
    id: "booking_intake",
    name: "Booking intake",
    icon: Inbox,
    phase: 2,
    summary:
      "Turns booking emails and attachments into a draft shipment, matching parties and locations already on file.",
    responsibilities: [
      "Read booking emails and the POs or spreadsheets attached.",
      "Match the shipper, consignee and addresses to parties and locations on file.",
      "Fill every shipment field it can source and list the gaps.",
      "Draft a reply asking the customer for what is missing.",
    ],
    replaces: "Retyping bookings from emails and PDFs into a new shipment.",
    trigger: "An email arrives in the bookings inbox.",
    tools: [
      "Model: read email + attachments",
      "GET /sidebars/{shipment}/fields",
      "GET /sidebars/{party|location}/records",
      "POST /sidebars/{shipment}/records (after approval)",
    ],
    autonomy: "approve",
    guardrails: [
      "Only fills fields it can source; gaps stay empty and are listed.",
      "New parties or locations are never created silently.",
    ],
    scenario: {
      trigger:
        "Email from Acme Precision Parts: “Booking — 6 pallets to JB” with PO-7781.pdf",
      steps: [
        {
          title: "Read the email and PO",
          tool: "Model: read email + PO-7781.pdf",
          result: "6 pallets, 2,100 kg, deliver to “JB warehouse 2” by Friday.",
        },
        {
          title: "Load the shipment fields",
          tool: "GET /sidebars/shipment/fields",
          result: "14 fields; 5 required.",
        },
        {
          title: "Match the parties and places",
          tool: "GET /sidebars/party/records · /location/records",
          result:
            "Shipper matched to Acme Precision Parts; “JB warehouse 2” matched to LOC-014.",
        },
        {
          title: "Draft the shipment",
          tool: "Model: fill the fields",
          result: "11 of 14 fields filled; pickup date missing.",
        },
      ],
      output: {
        kind: "draft",
        findings: [
          "Shipper: Acme Precision Parts (matched on file, 98%).",
          "Destination: LOC-014 Johor Bahru warehouse 2 (matched by address).",
          "6 pallets · 2,100 kg · deliver by Fri 7 Nov.",
          "Pickup date isn't in the email — drafted a reply asking for it.",
        ],
        draftTitle: "Draft reply to the customer",
        draft:
          "Thanks for booking PO-7781. Could you confirm the pickup date and time at Shah Alam? We'll confirm the delivery slot at JB warehouse 2 right after.",
      },
      approveLabel: "Create shipment and reply",
      rejectLabel: "Discard",
    },
  },
  {
    id: "customer_update",
    name: "Customer updates",
    icon: MessageSquareText,
    phase: 2,
    summary:
      "Writes delay notices, redelivery offers and “where is my shipment” answers from the checkpoints.",
    responsibilities: [
      "Draft delay notices with the new arrival time.",
      "Offer redelivery slots after a failed attempt, within the receiver’s hours.",
      "Answer “where is my shipment?” from the checkpoints.",
      "Say only what the record and checkpoints show.",
    ],
    replaces:
      "Writing the same status emails by hand for every delay or failed delivery.",
    trigger:
      "A customer-facing exception opens, or a customer asks for a status.",
    tools: [
      "GET /exceptions",
      "GET /dispatches/{id}/checkpoints",
      "Model: write the message",
      "Send email (after approval)",
    ],
    autonomy: "approve",
    guardrails: [
      "Only states what the checkpoints and record say.",
      "Every message is approved before it is sent.",
    ],
    scenario: {
      trigger:
        "EXC-0034 “Delivery attempt failed — receiver closed” on SHP-1040",
      steps: [
        {
          title: "Load the exception",
          tool: "GET /exceptions",
          result: "Attempt at 19:20 yesterday; receiver closed.",
        },
        {
          title: "Load the receiver's hours",
          tool: "GET /sidebars/location/records",
          result: "Open 08:30–17:30, weekdays.",
        },
        {
          title: "Find free slots",
          tool: "GET /dispatches",
          result: "Driver Aiman passes the area tomorrow 09:00–11:00.",
        },
        {
          title: "Write the message",
          tool: "Model: write the message",
          result: "Redelivery offer with two slots.",
        },
      ],
      output: {
        kind: "draft",
        findings: [
          "The attempt was after closing time (19:20 vs 17:30).",
          "Redelivery fits tomorrow 09:00–11:00 on an existing route, no extra trip.",
        ],
        draftTitle: "Draft email to the consignee",
        draft:
          "Hello, we tried to deliver SHP-1040 yesterday at 19:20 but the site was closed. We can redeliver tomorrow between 09:00 and 11:00. Reply to confirm, or suggest another time.",
      },
      approveLabel: "Send email",
      rejectLabel: "Discard draft",
    },
  },
  {
    id: "billing_audit",
    name: "Billing audit",
    icon: ReceiptText,
    phase: 3,
    summary:
      "Before an invoice is made, checks the POD, weights and extra charges against the rate card.",
    responsibilities: [
      "Check that charges from exceptions, such as waiting time and failed attempts, are billed.",
      "Compare the billed weight with the POD and weighbridge slip.",
      "Check rates and surcharges against the rate card.",
      "List suggested invoice changes, each with its source.",
    ],
    replaces:
      "Cross-checking PODs, exceptions and rate cards line by line before billing.",
    trigger: "A shipment's POD is verified and it moves to “ready to bill”.",
    tools: [
      "GET /billing",
      "GET /billing/rates",
      "GET /documents",
      "GET /exceptions",
    ],
    autonomy: "suggest",
    guardrails: [
      "Never creates or sends an invoice.",
      "Each suggested line names the exception or document it comes from.",
    ],
    scenario: {
      trigger: "SHP-1029 POD verified — ready to bill",
      steps: [
        {
          title: "Load what's ready to bill",
          tool: "GET /billing",
          result: "SHP-1029: freight + fuel surcharge + handling.",
        },
        {
          title: "Load the rate card",
          tool: "GET /billing/rates",
          result: "Land, Klang Valley → Penang, per kg; waiting time MYR 40/h.",
        },
        {
          title: "Read the POD",
          tool: "GET /documents",
          result: "POD signed 2 Nov 10:40; weighbridge slip 860 kg.",
        },
        {
          title: "Check its exceptions",
          tool: "GET /exceptions",
          result:
            "EXC-0022 “Arrived before opening”, resolved “Waited and delivered”, 1.5 h.",
        },
      ],
      output: {
        kind: "draft",
        findings: [
          "Waiting time 1.5 h from EXC-0022 isn't on the invoice: + MYR 60.",
          "Freight uses the record's 820 kg; the weighbridge slip says 860 kg.",
          "Fuel surcharge and handling are applied correctly.",
        ],
        draftTitle: "Suggested invoice changes",
        draft:
          "Add: Waiting time · 1.5 h × MYR 40 = MYR 60 (from EXC-0022)\nReview: chargeable weight 820 kg → 860 kg (weighbridge slip on the POD)",
      },
      approveLabel: "Add lines to invoice",
      rejectLabel: "Bill as it is",
    },
  },
  {
    id: "dispatch_planner",
    name: "Dispatch planner",
    icon: CalendarClock,
    phase: 3,
    summary:
      "Each morning, proposes a driver, vehicle and time for every shipment ready to go, and flags plans likely to fail.",
    responsibilities: [
      "Match each ready shipment to a free driver and a vehicle that fits the load.",
      "Time pickups around the receivers’ opening hours.",
      "Combine shipments going the same way into one trip.",
      "Flag plans likely to fail before they start.",
    ],
    replaces:
      "Matching shipments to drivers and vehicles by hand on the Dispatch board.",
    trigger: "Every morning at 06:00, and when a shipment becomes ready.",
    tools: [
      "GET /dispatches",
      "GET /sidebars/{driver|vehicle}/records",
      "GET /sidebars/{location}/records",
      "POST /dispatches/{id}/plan (after approval)",
    ],
    autonomy: "approve",
    guardrails: [
      "Plans only with drivers and vehicles marked available.",
      "Shows why for each pick; a person approves the whole plan.",
    ],
    scenario: {
      trigger: "06:00 — 4 shipments ready for dispatch",
      steps: [
        {
          title: "Load the open dispatches",
          tool: "GET /dispatches",
          result: "4 shipments unassigned for today.",
        },
        {
          title: "Load drivers and vehicles",
          tool: "GET /sidebars/driver/records · /vehicle/records",
          result: "3 drivers on shift; lorries of 3 t, 3 t and 10 t free.",
        },
        {
          title: "Load the receivers' hours",
          tool: "GET /sidebars/location/records",
          result: "Lumen Assembly opens at 09:00.",
        },
        {
          title: "Build the plan",
          tool: "Model: match loads, routes and hours",
          result: "4 planned on 3 lorries; one pickup moved for opening hours.",
        },
      ],
      output: {
        kind: "draft",
        findings: [
          "SHP-1044 → Aiman, lorry WXY 2231 (3 t; load 1.2 t).",
          "SHP-1045 → Mei Ling, lorry BKT 8810; pickup moved to 07:30 so it arrives after the 09:00 opening.",
          "SHP-1046 + SHP-1047 → Ravi, lorry PJK 4402 (10 t); same route, one trip.",
          "None flagged as overweight; all four fit today's shifts.",
        ],
        draftTitle: "Plan to approve",
        draft:
          "4 dispatches on 3 lorries. Pickups 07:00–08:15; first arrival 09:05.",
      },
      approveLabel: "Plan 4 dispatches",
      rejectLabel: "Plan by hand",
    },
  },
];
