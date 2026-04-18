// Custom catalog sources (localStorage).
// Two flavors:
//   - URL sources: fetched at runtime from a remote JSON endpoint
//   - Inline sources: full JSON payload stored locally (from upload or generator)

const KEY = "vstreamzzz:sources:v1";
const INLINE_KEY = "vstreamzzz:inline-sources:v1";

export type SourceKind = "films" | "series";

export interface CustomSource {
  id: string;
  name: string;
  kind: SourceKind;
  url: string;
  enabled: boolean;
  addedAt: number;
}

export interface InlineSource {
  id: string;
  name: string;
  kind: SourceKind;
  // Stored as a JSON string to keep payload size predictable in localStorage.
  data: string;
  enabled: boolean;
  addedAt: number;
  count: number;
}

// ---------- URL sources ----------
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

export const addSource = (
  input: Omit<CustomSource, "id" | "addedAt" | "enabled"> & { enabled?: boolean }
) => {
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

// ---------- Inline sources (uploaded / generated JSON) ----------
const readInline = (): InlineSource[] => {
  try {
    return JSON.parse(localStorage.getItem(INLINE_KEY) || "[]") as InlineSource[];
  } catch {
    return [];
  }
};

const writeInline = (v: InlineSource[]) => {
  try {
    localStorage.setItem(INLINE_KEY, JSON.stringify(v));
  } catch (err) {
    // localStorage quota — bubble up so UI can show a toast.
    throw err;
  }
};

export const listInlineSources = (): InlineSource[] => readInline();

export const listEnabledInlineSources = (kind: SourceKind): InlineSource[] =>
  readInline().filter((s) => s.enabled && s.kind === kind);

export const addInlineSource = (input: {
  name: string;
  kind: SourceKind;
  data: unknown[];
}): InlineSource => {
  const all = readInline();
  const item: InlineSource = {
    id: `inl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    addedAt: Date.now(),
    enabled: true,
    name: input.name.trim() || `${input.kind}.json`,
    kind: input.kind,
    data: JSON.stringify(input.data),
    count: input.data.length,
  };
  all.push(item);
  writeInline(all);
  return item;
};

export const removeInlineSource = (id: string) => {
  writeInline(readInline().filter((s) => s.id !== id));
};

export const toggleInlineSource = (id: string) => {
  writeInline(readInline().map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
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
