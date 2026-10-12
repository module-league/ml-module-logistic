export type ModuleThemeMode = "light" | "dark";

export interface IModuleSettings {
  mode: ModuleThemeMode;
  /** Hex colour, e.g. "#1d4ed8". */
  primary: string;
  /** CSS gradient drawn behind the whole module. */
  background: string;
}

export interface PrimaryPreset {
  name: string;
  primary: string;
  background: string;
}
