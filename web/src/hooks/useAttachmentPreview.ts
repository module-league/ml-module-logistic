import { useCallback, useMemo, useState } from "react";

/**
 * Open state for AttachmentPreviewDialog: the files it can step through and which one shows.
 * The files stay set after closing so the dialog can animate out.
 * @example
 * const { openPreview, dialogProps } = useAttachmentPreview();
 * <button onClick={() => openPreview(attachments, 1)} />
 * <AttachmentPreviewDialog {...dialogProps} />
 */
export function useAttachmentPreview() {
  const [attachments, setAttachments] = useState<IAttachment[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const openPreview = useCallback((list: IAttachment[], at = 0) => {
    setAttachments(list);
    setIndex(at);
    setOpen(true);
  }, []);
  const dialogProps = useMemo(
    () => ({
      attachments,
      index,
      open,
      onOpenChange: setOpen,
      onIndexChange: setIndex,
    }),
    [attachments, index, open],
  );
  return useMemo(() => ({ openPreview, dialogProps }), [openPreview, dialogProps]);
}
