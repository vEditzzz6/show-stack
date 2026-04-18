// Lightweight per-item playback progress store (localStorage).
// Keyed by a stable id derived from the stream URL.

const KEY = "vstreamzzz:progress:v1";
const META_KEY = "vstreamzzz:progress-meta:v1";

export interface ProgressEntry {
  position: number; // seconds
  duration: number; // seconds
  updatedAt: number; // ms epoch
}

export interface ProgressMeta {
  id: string;
  kind: "film" | "episode";
  title: string;
  poster?: string;
  subtitle?: string;
  stream: string;
  // Series linkage for resume targeting
  seriesTitle?: string;
  season?: number;
  episode?: number | null;
  filmTitle?: string;
}

type ProgressMap = Record<string, ProgressEntry>;
type MetaMap = Record<string, ProgressMeta>;

export const makeId = (stream: string) => {
  // Stable, URL-safe-ish id. Stream URLs are unique per item in this app.
  try {
    return btoa(unescape(encodeURIComponent(stream))).replace(/=+$/, "");
  } catch {
    return stream;
  }
};

const readMap = <T,>(k: string): T => {
  try {
    return JSON.parse(localStorage.getItem(k) || "{}") as T;
  } catch {
    return {} as T;
  }
};

const writeMap = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
};

export const getProgress = (id: string): ProgressEntry | null => {
  const map = readMap<ProgressMap>(KEY);
  return map[id] ?? null;
};

export const saveProgress = (id: string, position: number, duration: number) => {
  if (!id || !isFinite(position) || !isFinite(duration) || duration <= 0) return;
  const map = readMap<ProgressMap>(KEY);
  // Treat near-end as completed → remove from continue watching
  if (position / duration >= 0.95 || duration - position < 20) {
    delete map[id];
  } else if (position < 5) {
    // Don't pollute with tiny/accidental opens
    return;
  } else {
    map[id] = { position, duration, updatedAt: Date.now() };
  }
  writeMap(KEY, map);
};

export const removeProgress = (id: string) => {
  const map = readMap<ProgressMap>(KEY);
  delete map[id];
  writeMap(KEY, map);
  const meta = readMap<MetaMap>(META_KEY);
  delete meta[id];
  writeMap(META_KEY, meta);
};

export const upsertMeta = (meta: ProgressMeta) => {
  const map = readMap<MetaMap>(META_KEY);
  map[meta.id] = meta;
  writeMap(META_KEY, map);
};

export interface ContinueItem extends ProgressMeta {
  progress: ProgressEntry;
  percent: number;
}

export const listContinueWatching = (): ContinueItem[] => {
  const progress = readMap<ProgressMap>(KEY);
  const metas = readMap<MetaMap>(META_KEY);
  return Object.entries(progress)
    .map(([id, p]) => {
      const meta = metas[id];
      if (!meta) return null;
      return {
        ...meta,
        progress: p,
        percent: Math.min(100, Math.max(0, (p.position / p.duration) * 100)),
      } as ContinueItem;
    })
    .filter((x): x is ContinueItem => !!x)
    .sort((a, b) => b.progress.updatedAt - a.progress.updatedAt);
};
