import { useCallback } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/editor/contrib/suggest/browser/suggestController";
import "monaco-editor/editor/contrib/snippet/browser/snippetController2";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import { cn } from "@/lib/utils";
import { FORMULA_FUNCTIONS } from "@/lib/formulaHelper";
import { Spinner } from "@/components/ui/spinner";
import type { FormulaEditorProps } from "./FormulaEditor.types";

const LANGUAGE = "formula";

// Monaco is bundled with the app instead of fetched from a CDN
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

monaco.languages.register({ id: LANGUAGE });
monaco.languages.setMonarchTokensProvider(LANGUAGE, {
  tokenizer: {
    root: [
      [/\{[^}]*\}?/, "variable"],
      [/\d*\.?\d+/, "number"],
      [/[a-zA-Z_]\w*/, "keyword"],
      [/[+\-*/%^]/, "operator"],
      [/[(),]/, "delimiter"],
    ],
  },
});
monaco.languages.setLanguageConfiguration(LANGUAGE, {
  brackets: [["(", ")"]],
  autoClosingPairs: [{ open: "(", close: ")" }],
});
monaco.editor.defineTheme(LANGUAGE, {
  base: "vs",
  inherit: true,
  rules: [
    { token: "variable", foreground: "1d4ed8", fontStyle: "bold" },
    { token: "keyword", foreground: "7c3aed" },
    { token: "number", foreground: "0f766e" },
    { token: "operator", foreground: "475569" },
  ],
  colors: { "editor.background": "#00000000", focusBorder: "#00000000" },
});

// Suggestions sit on the page body above dialogs: a transformed dialog would offset fixed widgets inside it
const overflowWidgets = document.createElement("div");
overflowWidgets.className = "monaco-editor";
overflowWidgets.style.cssText =
  "position:absolute;top:0;left:0;z-index:60;pointer-events:auto";
document.body.appendChild(overflowWidgets);

const OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  lineNumbers: "off",
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 0,
  scrollBeyondLastLine: false,
  wordWrap: "on",
  renderLineHighlight: "none",
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { horizontal: "hidden", verticalScrollbarSize: 6 },
  fontSize: 13,
  padding: { top: 8, bottom: 8 },
  quickSuggestions: { other: true, comments: false, strings: true },
  suggestOnTriggerCharacters: true,
  wordBasedSuggestions: "off",
  contextmenu: false,
  automaticLayout: true,
  fixedOverflowWidgets: true,
  overflowWidgetsDomNode: overflowWidgets,
  ariaLabel: "Formula",
};

/**
 * A one-line Monaco editor for a formula: typing a field's name or "{" suggests the number fields, and a function's name its math.js function.
 * Fields show as {Field name}; Enter picks a suggestion and never adds a line.
 * @example
 * <FormulaEditor defaultValue="{Weight} * 2" fields={numberFields} onChange={setText} />
 */
export default function FormulaEditor({
  id,
  defaultValue,
  fields,
  onChange,
  invalid = false,
  className,
}: FormulaEditorProps) {
  // The completion provider belongs to the language, so it only answers for this editor's model and goes with the editor
  const mount = useCallback<OnMount>(
    (editor) => {
      const model = editor.getModel();
      editor.addCommand(
        monaco.KeyCode.Enter,
        () => {},
        "!suggestWidgetVisible",
      );
      const provider = monaco.languages.registerCompletionItemProvider(
        LANGUAGE,
        {
          triggerCharacters: ["{"],
          provideCompletionItems: (current, position) => {
            if (current !== model) return { suggestions: [] };
            const before = current
              .getLineContent(position.lineNumber)
              .slice(0, position.column - 1);
            const open = before.lastIndexOf("{");
            const insideBraces = open > before.lastIndexOf("}");
            const word = current.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: insideBraces ? open + 1 : word.startColumn,
              endColumn: position.column,
            };
            const fieldItems = fields.map((field) => ({
              label: field.name,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail:
                field.type === "currency" ? "Currency field" : "Number field",
              insertText: `{${field.name}}`,
              filterText: insideBraces ? `{${field.name}` : field.name,
              sortText: `0${field.name}`,
              range,
            }));
            if (insideBraces) return { suggestions: fieldItems };
            return {
              suggestions: [
                ...fieldItems,
                ...FORMULA_FUNCTIONS.map((fn) => ({
                  label: fn.name,
                  kind: monaco.languages.CompletionItemKind.Function,
                  detail: fn.signature,
                  documentation: fn.description,
                  insertText: `${fn.name}($0)`,
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  sortText: `1${fn.name}`,
                  range,
                })),
              ],
            };
          },
        },
      );
      editor.onDidDispose(() => provider.dispose());
    },
    [fields],
  );

  return (
    <div
      id={id}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-24 overflow-hidden rounded-md border bg-transparent shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive focus-within:ring-destructive/20",
        className,
      )}
    >
      <Editor
        language={LANGUAGE}
        theme={LANGUAGE}
        defaultValue={defaultValue}
        options={OPTIONS}
        onMount={mount}
        onChange={(value) => onChange(value ?? "")}
        loading={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="size-3.5" />
            Loading the formula editor…
          </span>
        }
      />
    </div>
  );
}
