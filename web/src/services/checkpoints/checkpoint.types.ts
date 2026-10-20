declare global {
  /** A note or files posted on a dispatch's timeline (lg_checkpoint_log). Matches CheckpointLogResponse in the API. */
  type ICheckpointLog = {
    objId: string;
    dispatchId: string;
    note?: string;
    /** Seen by the team only. */
    internalOnly: boolean;
    attachments: IAttachment[];
    /** The poster's user id; all zeros until sign-in is wired up. */
    createdBy: string;
    createTime: string;
  };

  /** Needs a note or a file; files are uploaded with refId set to the dispatch's objId, each with an optional label. */
  type ICheckpointLogCreate = Pick<ICheckpointLog, "note" | "internalOnly"> & {
    attachments: Pick<IAttachment, "id" | "optionId">[];
  };
}
