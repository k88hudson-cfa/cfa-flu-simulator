import { parse } from "smol-toml";
import rawToml from "./ui-params.toml?raw";

export type FieldType = "integer" | "float" | "percent" | "select";

export interface SelectOption {
  value: number;
  label: string;
}

export interface FieldConfig {
  section?: string;
  show_when_doses_2?: boolean;
  label: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  type?: FieldType;
  slider?: boolean;
  per_group?: boolean;
  matrix?: boolean;
  options?: SelectOption[];
}

// Flatten nested TOML to dotted-path lookup: { "scenario.days": {...}, ... }
function flatten(
  obj: Record<string, unknown>,
  prefix = "",
  out: Record<string, FieldConfig> = {},
): Record<string, FieldConfig> {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const v = value as Record<string, unknown>;
      // Leaf: has `label` (every field config does).
      if (typeof v.label === "string") {
        out[path] = v as unknown as FieldConfig;
      } else {
        flatten(v, path, out);
      }
    }
  }
  return out;
}

const config = flatten(parse(rawToml) as Record<string, unknown>);

export function getField(path: string): FieldConfig {
  const entry = config[path];
  if (!entry) throw new Error(`ui-params.toml: no config for "${path}"`);
  return entry;
}

export function allFields(): Record<string, FieldConfig> {
  return config;
}

// Fields belonging to a section, in TOML declaration order.
export function fieldsInSection(section: string): [string, FieldConfig][] {
  return Object.entries(config).filter(([, cfg]) => cfg.section === section);
}
