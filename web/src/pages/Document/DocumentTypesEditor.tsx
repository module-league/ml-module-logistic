import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Input, Switch } from "@moduleleague/ui";

interface DocumentTypesEditorProps {
  types: IDocumentType[];
  onChange: (types: IDocumentType[]) => void;
  onAdd: () => void;
  /** Also drops the requirements that name it. */
  onRemove: (docType: string) => void;
}

/**
 * The kinds of paper the checklist knows: each one's title, the words that suggest it from a file's name, and whether it expires.
 * @example
 * <DocumentTypesEditor types={draft.types} onChange={setTypes} onAdd={addType} onRemove={removeType} />
 */
export function DocumentTypesEditor({
  types,
  onChange,
  onAdd,
  onRemove,
}: DocumentTypesEditorProps) {
  const update = (docType: string, patch: Partial<IDocumentType>) =>
    onChange(
      types.map((type) =>
        type.docType === docType ? { ...type, ...patch } : type,
      ),
    );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-3xl table-fixed text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="w-1/3 px-3 py-2 font-medium">Document</th>
            <th className="px-3 py-2 font-medium">
              Suggested from file names with
            </th>
            <th className="w-44 px-3 py-2 font-medium">Expires</th>
            <th className="w-9 py-2 pr-3 pl-0">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type.docType} className="border-t align-middle">
              <td className="px-3 py-1.5">
                <Input
                  aria-label="Document title"
                  aria-invalid={type.title.trim() === "" || undefined}
                  maxLength={80}
                  placeholder="e.g. Air waybill"
                  value={type.title}
                  onChange={(event) =>
                    update(type.docType, { title: event.target.value })
                  }
                  className="h-7 text-xs"
                />
              </td>
              <td className="px-3 py-1.5">
                <KeywordsInput
                  keywords={type.keywords}
                  onChange={(keywords) => update(type.docType, { keywords })}
                />
              </td>
              <td className="py-1.5 pr-1 pl-3">
                <label
                  className="flex cursor-pointer items-center gap-2"
                  title="Asks until when it's valid when verified, e.g. certificates and permits"
                >
                  <Switch
                    size="sm"
                    checked={type.expires}
                    onCheckedChange={(expires) =>
                      update(type.docType, { expires })
                    }
                  />
                  {type.expires ? "Asks for a date" : "Never"}
                </label>
              </td>
              <td className="py-1.5 pr-3 pl-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${type.title !== "" ? type.title : "document type"}`}
                  title="Remove, with its requirements"
                  className="text-muted-foreground hover:text-foreground"
                  startIcon={<X size={13} />}
                  onClick={() => onRemove(type.docType)}
                />
              </td>
            </tr>
          ))}
          <tr className="border-t">
            <td colSpan={4} className="p-0">
              <button
                type="button"
                onClick={onAdd}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Add document type
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Keywords typed as a comma separated list; it's split when the box loses focus, so commas can be typed. */
function KeywordsInput({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [text, setText] = useState<string>();
  const commit = () => {
    if (text === undefined) return;
    onChange(
      text
        .split(",")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word !== ""),
    );
    setText(undefined);
  };

  return (
    <Input
      aria-label="Keywords"
      placeholder="e.g. awb, waybill"
      value={text ?? keywords.join(", ")}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      className="h-7 text-xs"
    />
  );
}
