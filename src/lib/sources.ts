// Custom catalog source URLs (localStorage).
// Users can add their own films.json / series.json endpoints in Settings.

const KEY = "vstreamzzz:sources:v1";

export type SourceKind = "films" | "series";

export interface CustomSource {
  id: string;
  name: string;
  kind: SourceKind;
  url: string;
  enabled: boolean;
  addedAt: number;
}

const read = (): CustomSource[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CustomSource[];
  } catch {
    return [];
  }
};

const write = (v: CustomSource[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export const listSources = (): CustomSource[] => read();

export const listEnabledSources = (kind: SourceKind): CustomSource[] =>
  read().filter((s) => s.enabled && s.kind === kind);

export const addSource = (input: Omit<CustomSource, "id" | "addedAt" | "enabled"> & { enabled?: boolean }) => {
  const all = read();
  const item: CustomSource = {
    id: `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    addedAt: Date.now(),
    enabled: input.enabled ?? true,
    name: input.name.trim() || input.url,
    kind: input.kind,
    url: input.url.trim(),
  };
  all.push(item);
  write(all);
  return item;
};

export const removeSource = (id: string) => {
  write(read().filter((s) => s.id !== id));
};

export const toggleSource = (id: string) => {
  write(read().map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
};

// Notify listeners when sources change so the catalog can refetch.
export const SOURCES_EVENT = "vstreamzzz:sources-changed";
export const emitSourcesChanged = () => {
  try {
    window.dispatchEvent(new CustomEvent(SOURCES_EVENT));
  } catch {
    /* ignore */
  }
};
