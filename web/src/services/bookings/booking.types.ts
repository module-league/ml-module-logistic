declare global {
  /** A booking email and/or the ids of its files (uploaded for the shipment table); at least one. */
  type IBookingIntakeRequest = { emailText?: string; attachmentIds: string[] };

  /** What the AI read from a booking, ready for the New record form; nothing is saved. Matches BookingIntakeResponse. */
  type IBookingIntake = {
    /** One or two sentences on what is booked. */
    summary: string;
    /** Stored values by shipment field objId, as the record API takes them. */
    values: Record<string, string>;
    /** The same values as people read them, in field order. */
    rows: { fieldId: string; name: string; text: string; source: string }[];
    /** Names of the fields left empty. */
    missing: string[];
    /** Parties or places the booking names that aren't on file. */
    notOnFile: { field: string; text: string }[];
    /** What to confirm before creating. */
    checks: string[];
    /** A reply to the sender asking for what's missing. */
    reply: { subject: string; message: string };
    usage: { model: string; inputTokens: number; outputTokens: number };
  };
}
