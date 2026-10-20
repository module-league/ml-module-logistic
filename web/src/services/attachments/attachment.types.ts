declare global {
  /** An uploaded file; an attachment field stores a JSON array of these. Matches AttachmentResponse in the API. */
  type IAttachment = {
    id: string;
    name: string;
    /** The MIME type, e.g. image/png. */
    fileType: string;
    /** Lowercase, without the dot, e.g. docx, png. */
    fileExtension: string;
    /** In KB. */
    fileSize: number;
    attachmentVersion: number;
    /** The label picked for the file in a record: the id of one of its attachment field's options. */
    optionId?: string;
    /** A label typed for the file, e.g. "Proof of delivery"; checkpoint log files use it instead of optionId. */
    label?: string;
  };
}
