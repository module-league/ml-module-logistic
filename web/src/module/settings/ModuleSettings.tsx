import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Bell, Check, Moon, Palette, Plus, RotateCcw, Sun } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
  toast,
} from "@moduleleague/ui";
import { PRIMARY_PRESETS, readableForeground } from "@/lib/colorUtils";
import {
  DEFAULT_MODULE_SETTINGS,
  isDefaultModuleSettings,
  settingsKey,
  themeScopeStyle,
  updateModuleSettings,
  useModuleSettings,
} from "./moduleSettings.utils";
import type { IModuleConfig } from "@/module/shell/module.types";
import type {
  IModuleSettings,
  ModuleThemeMode,
  PrimaryPreset,
} from "./moduleSettings.types";

interface ModuleSettingsProps {
  config: IModuleConfig;
  /** The element that opens the settings, e.g. the sidebar's Settings button. */
  children: ReactNode;
}

const MODES: {
  value: ModuleThemeMode;
  label: string;
  icon: typeof Sun;
  available: boolean;
}[] = [
  { value: "light", label: "Light", icon: Sun, available: true },
  { value: "dark", label: "Dark", icon: Moon, available: false },
];

export function ModuleSettings({ config, children }: ModuleSettingsProps) {
  const storageKey = useMemo(() => settingsKey(config?.code), [config?.code]);
  const settings = useModuleSettings(storageKey);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<IModuleSettings>(settings);

  const isLightPrimary = useMemo(
    () => readableForeground(draft?.primary) !== "oklch(0.985 0 0)",
    [draft?.primary],
  );
  const scopeStyle = useMemo(() => themeScopeStyle(draft), [draft]);
  const activePreset = useMemo(
    () =>
      PRIMARY_PRESETS.find(
        (preset) =>
          preset?.primary === draft?.primary?.toLowerCase() &&
          preset?.background === draft?.background,
      ),
    [draft?.primary, draft?.background],
  );

  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) setDraft(settings);
      setOpen(next);
    },
    [settings],
  );
  const setPreset = useCallback(
    (preset: PrimaryPreset) =>
      setDraft((current) => ({
        ...current,
        primary: preset?.primary,
        background: preset?.background,
      })),
    [],
  );
  const reset = useCallback(() => setDraft(DEFAULT_MODULE_SETTINGS), []);
  const save = useCallback(() => {
    updateModuleSettings(storageKey, draft);
    toast.success("Settings saved", {
      description: `${activePreset?.name ?? "Custom"} theme is applied to ${config?.title}.`,
    });
  }, [storageKey, draft, activePreset?.name, config?.title]);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-6 sm:max-w-2xl" style={scopeStyle}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-6 text-primary" />
            {config?.title} settings
          </DialogTitle>
          <DialogDescription>
            Preview your choice here; it is applied when you click Done and
            saved on this device.
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3">
          <SectionTitle title="Mode" />
          <div
            role="radiogroup"
            aria-label="Mode"
            className="grid grid-cols-2 gap-3"
          >
            {MODES.map((mode) => (
              <ModeCard
                key={mode.value}
                mode={mode}
                selected={draft?.mode === mode.value}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle
            title="Theme"
            hint="The backdrop gradient, plus the colour of buttons, links, the active page and focus rings."
          />
          <div
            role="radiogroup"
            aria-label="Theme"
            className="flex flex-wrap gap-3"
          >
            {PRIMARY_PRESETS.map((preset) => (
              <Swatch
                key={preset.name}
                preset={preset}
                selected={
                  draft?.primary?.toLowerCase() === preset.primary &&
                  draft?.background === preset.background
                }
                onSelect={setPreset}
              />
            ))}
          </div>
          {isLightPrimary && (
            <p className="text-xs text-amber-700">
              This colour is light, so links and highlighted text may be hard to
              read. A darker shade works better.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle title="Preview" />
          <ThemePreview config={config} />
        </section>

        <DialogFooter className="items-center sm:justify-between">
          <Button
            variant="outline"
            size="xs"
            onClick={reset}
            disabled={isDefaultModuleSettings(draft)}
            startIcon={<RotateCcw size={14} />}
          >
            Reset to default
          </Button>
          <DialogClose asChild>
            <Button size="xs" onClick={save}>
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ModeCard({
  mode,
  selected,
}: {
  mode: (typeof MODES)[number];
  selected: boolean;
}) {
  const Icon = mode?.icon;
  const dark = mode?.value === "dark";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={!mode?.available}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted",
      )}
    >
      <div
        className={cn(
          "flex h-14 gap-1.5 rounded-md p-1.5",
          dark ? "bg-neutral-900" : "bg-(image:--module-backdrop)",
        )}
      >
        <div
          className={cn(
            "w-1/4 rounded-sm",
            dark ? "bg-neutral-800" : "bg-background",
          )}
        />
        <div className="flex flex-1 flex-col gap-1">
          <div
            className={cn(
              "h-2 w-2/3 rounded-sm",
              dark ? "bg-neutral-700" : "bg-foreground/15",
            )}
          />
          <div className="h-2 w-1/3 rounded-sm bg-primary" />
          <div
            className={cn(
              "flex-1 rounded-sm",
              dark ? "bg-neutral-800" : "bg-background",
            )}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-0.5 text-sm font-medium">
        <Icon className="size-3.5" />
        {mode?.label}
        {!mode?.available && (
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Coming soon
          </span>
        )}
        {selected && <Check className="ml-auto size-3.5 text-primary" />}
      </div>
    </button>
  );
}

function Swatch({
  preset,
  selected,
  onSelect,
}: {
  preset: PrimaryPreset;
  selected: boolean;
  onSelect: (preset: PrimaryPreset) => void;
}) {
  const foreground = useMemo(
    () => readableForeground(preset?.primary),
    [preset?.primary],
  );

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={preset?.name}
      title={preset?.name}
      onClick={() => onSelect(preset)}
      className="group flex flex-col items-center gap-1"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full border border-black/5 ring-offset-2 ring-offset-popover transition-shadow",
          selected
            ? "ring-2 ring-(--swatch-primary)"
            : "group-hover:ring-2 group-hover:ring-(--swatch-primary)/30",
        )}
        style={
          {
            backgroundImage: preset?.background,
            "--swatch-primary": preset?.primary,
          } as CSSProperties
        }
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full shadow-sm ring-2 ring-white transition-all",
            selected ? "size-5" : "size-3.5",
          )}
          style={{ backgroundColor: preset?.primary, color: foreground }}
        >
          {selected && <Check className="size-3" />}
        </span>
      </span>
      <span
        className={cn(
          "text-xs",
          selected ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {preset?.name}
      </span>
    </button>
  );
}

const PREVIEW_NAV = ["w-14", "w-16", "w-12", "w-14"];

const PREVIEW_ROWS = [
  { pill: "w-8", tinted: true, selected: false },
  { pill: "w-10", tinted: false, selected: true },
  { pill: "w-7", tinted: true, selected: false },
  { pill: "w-9", tinted: false, selected: false },
];

function PreviewBone({ className }: { className?: string }) {
  return <Skeleton className={cn("animate-none rounded-sm", className)} />;
}

function ThemePreview({ config }: { config: IModuleConfig }) {
  const ModuleIcon = config?.icon;

  return (
    <div
      aria-hidden
      className="pointer-events-none flex h-60 overflow-hidden rounded-lg border bg-(image:--module-backdrop) text-[10px] select-none"
    >
      <aside className="flex w-32 shrink-0 flex-col gap-2 bg-linear-to-b from-sidebar/90 to-transparent p-2">
        <div className="flex items-center gap-1.5 px-0.5">
          {ModuleIcon && <ModuleIcon className="size-3.5 text-primary" />}
          <span className="truncate text-[11px] font-semibold">
            {config?.title}
          </span>
        </div>
        <PreviewBone className="h-4 bg-background/70" />
        <div className="flex flex-col gap-0.5">
          {PREVIEW_NAV.map((width, index) => (
            <div
              key={index}
              className={cn(
                "relative flex items-center gap-1.5 rounded-sm px-1.5 py-1.5",
                index === 0 && "bg-sidebar-accent",
              )}
            >
              {index === 0 && (
                <span className="absolute top-1/2 left-0 h-2 -translate-y-1/2 border-l-2 border-primary" />
              )}
              <PreviewBone
                className={cn("size-3", index === 0 && "bg-primary/60")}
              />
              <PreviewBone
                className={cn("h-1.5", width, index === 0 && "bg-primary/60")}
              />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-1.5 px-0.5">
          <PreviewBone className="size-4 rounded-full bg-background/80" />
          <PreviewBone className="h-1.5 w-12 bg-background/80" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-6 shrink-0 items-center justify-end gap-1.5 px-2">
          <Bell className="size-2 text-muted-foreground" size={10} />
          <PreviewBone className="size-4 rounded-full bg-background/80" />
        </div>
        <div className="ml-1 flex min-h-0 flex-1 flex-col rounded-tl-lg border-t border-l border-white/50 bg-white/25 pt-1 pl-1 backdrop-blur-sm">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-md border-t border-l bg-background">
            <div className="flex items-center gap-1 border-b px-1.5 py-1">
              <span className="flex items-center gap-1 rounded-sm bg-primary-10 px-1.5 py-1">
                <PreviewBone className="size-2 bg-primary/60" />
                <PreviewBone className="h-1.5 w-10 bg-primary/60" />
              </span>
              <PreviewBone className="h-3 w-12" />
            </div>

            <div className="flex flex-col gap-2 bg-muted/40 p-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <PreviewBone className="h-2.5 w-20 bg-foreground/15" />
                  <PreviewBone className="h-1.5 w-32" />
                </div>
                <div className="flex -space-x-1">
                  {[0, 1, 2].map((dot) => (
                    <PreviewBone
                      key={dot}
                      className="size-3.5 rounded-full ring-1 ring-background"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="flex items-center gap-0.5 rounded-sm bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">
                  <Plus className="size-2.5" />
                  New
                </span>
                <PreviewBone className="h-4 w-12 border bg-background" />
                <PreviewBone className="h-4 w-10 border bg-background" />
                <PreviewBone className="ml-auto h-4 w-16 border bg-background" />
              </div>

              <div className="flex flex-col rounded-sm border bg-background">
                {PREVIEW_ROWS.map((row, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 border-b px-1.5 py-1.5 last:border-b-0",
                      row.selected && "bg-primary-10",
                    )}
                  >
                    <PreviewBone className="h-1.5 w-8" />
                    <PreviewBone className="h-1.5 w-10 bg-primary/50" />
                    <PreviewBone className="h-1.5 flex-1" />
                    <PreviewBone
                      className={cn(
                        "h-2.5 rounded-full",
                        row.pill,
                        row.tinted && "bg-primary-20",
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
