import { useMemo } from "react";
import {
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Separator,
} from "@moduleleague/ui";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { attachmentUrl } from "@/services/attachments/attachment.api";
import { ModuleRecordForm } from "./ModuleRecordForm";
import { useNewRecordSave } from "./useNewRecordSave";
import type { ModuleNewRecordWithFormProps } from "./moduleRecord.types";
import { nonEmpty } from "@/lib/stringHelper";

/**
 * Adds a record through one of its sidebar's forms, laid out as people see the form:
 * its cover and logo, title and description, its fields in order with their hints and defaults, then Clear and Submit.
 * @example
 * <ModuleNewRecordWithForm open={open} onOpenChange={setOpen} form={form} fields={fields} onSave={add} />
 */
export function ModuleNewRecordWithForm({
  open,
  onOpenChange,
  title = "New record",
  form,
  fields,
  members,
  onUploadAttachment,
  isLoading = false,
  error,
  onRetry,
  onSave,
}: ModuleNewRecordWithFormProps) {
  const { saving, save, changeOpen } = useNewRecordSave(onSave, onOpenChange);
  const layout = useMemo(() => {
    const fieldById = new Map(fields.map((field) => [field.objId, field]));
    const items =
      form?.fields?.filter((item) => fieldById.has(item.fieldId)) ?? [];
    return {
      fields: items.flatMap((item) => fieldById.get(item.fieldId) ?? []),
      initialValues: Object.fromEntries(
        items.flatMap((item) =>
          item.defaultValue != null && item.defaultValue !== ""
            ? [[item.fieldId, item.defaultValue]]
            : [],
        ),
      ),
      placeholders: Object.fromEntries(
        items.flatMap((item) =>
          item.placeholder != null && item.placeholder !== ""
            ? [[item.fieldId, item.placeholder]]
            : [],
        ),
      ),
    };
  }, [form?.fields, fields]);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        {...((form?.formDescription == null || form.formDescription === "") && {
          "aria-describedby": undefined,
        })}
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        <div className="flex min-h-64 flex-1 flex-col overflow-y-auto">
          {!form && <DialogTitle className="sr-only">{title}</DialogTitle>}
          <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
            {form && (
              <>
                <div
                  className={cn(
                    "h-28 shrink-0 sm:h-40",
                    (form.coverImageId == null || form.coverImageId === "") &&
                      "bg-linear-to-br from-primary-10 to-primary/25",
                  )}
                >
                  {form.coverImageId != null && form.coverImageId !== "" && (
                    <img
                      src={attachmentUrl(form.coverImageId)}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "px-5 pb-6 sm:px-8 sm:pb-8",
                    (form.logoId == null || form.logoId === "") && "pt-6",
                  )}
                >
                  {form.logoId != null && form.logoId !== "" && (
                    <img
                      src={attachmentUrl(form.logoId)}
                      alt=""
                      className="-mt-10 mb-4 size-20 rounded-xl border-4 border-background bg-muted object-cover shadow-sm"
                    />
                  )}
                  <DialogTitle className="text-2xl font-semibold">
                    {form.formTitle}
                  </DialogTitle>
                  {form.formDescription != null &&
                    form.formDescription !== "" && (
                      <DialogDescription className="mt-1 whitespace-pre-line">
                        {form.formDescription}
                      </DialogDescription>
                    )}
                  <Separator className="my-6" />
                  <ModuleRecordForm
                    key={form.objId}
                    {...layout}
                    variant="form"
                    members={members}
                    onUploadAttachment={onUploadAttachment}
                    saving={saving}
                    submitLabel={nonEmpty(form.submitLabel) ?? "Submit"}
                    clearLabel={nonEmpty(form.clearLabel) ?? "Clear form"}
                    savingLabel="Submitting…"
                    onSave={(values) => void save(values)}
                  />
                </div>
              </>
            )}
          </QueryWrapper>
        </div>
      </DialogContent>
    </Dialog>
  );
}
