declare global {
  /** A dispatch status, or billed: posted when the shipment's invoice is sent, while the dispatch stays delivered. */
  type ICheckpointStatus = IDispatchStatus | "billed";

  /** A note or files posted on a dispatch's timeline (lg_checkpoint_log). Matches CheckpointLogResponse in the API. */
  type ICheckpointLog = {
    objId: string;
    dispatchId: string;
    /** The status the dispatch moved to, or billed; left out for a note or files. */
    status?: ICheckpointStatus;
    note?: string;
    /** Seen by the team only. */
    internalOnly: boolean;
    /** Each with the label typed for it, if any. */
    attachments: IAttachment[];
    /** The poster's user id; all zeros until sign-in is wired up. */
    createdBy: string;
    createTime: string;
  };

  /** Needs a note or a file; files are uploaded with refId set to the dispatch's objId, each with an optional typed label. */
  type ICheckpointLogCreate = Pick<ICheckpointLog, "note" | "internalOnly"> & {
    attachments: Pick<IAttachment, "id" | "label">[];
  };
}
