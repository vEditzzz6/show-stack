export interface Film {
  title: string;
  poster: string;
  backdrop?: string;
  overview?: string;
  rating?: number | null;
  runtime?: number | null;
  genres?: string[];
  group: string;
  year: string | null;
  tmdb_id?: number | null;
  stream: string;
}

export interface Episode {
  episode: number | null;
  title: string;
  stream: string;
  overview?: string;
  air_date?: string | null;
  still?: string;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface Series {
  title: string;
  poster: string;
  backdrop?: string;
  overview?: string;
  rating?: number | null;
  genres?: string[];
  year?: string | null;
  tmdb_id?: number | null;
  seasons: Season[];
}

import { listEnabledInlineSources, listEnabledSources } from "./sources";

const BASE = "https://vstreamzzz.veditzzz.site";

async function safeJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function safeParseInline<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// Merge default catalog with any user-added URLs and inline (uploaded/generated)
// payloads, de-duped by title.
async function fetchMerged<T extends { title: string }>(
  defaultUrl: string,
  kind: "films" | "series"
): Promise<T[]> {
  const urls = [defaultUrl, ...listEnabledSources(kind).map((s) => s.url)];
  const remoteResults = await Promise.all(urls.map((u) => safeJson<T[]>(u, [])));
  const inlineResults = listEnabledInlineSources(kind).map((s) =>
    safeParseInline<T>(s.data)
  );
  const merged: T[] = [];
  const seen = new Set<string>();
  for (const list of [...remoteResults, ...inlineResults]) {
    for (const item of list) {
      const key = (item.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

export const fetchFilms = () => fetchMerged<Film>(`${BASE}/films.json`, "films");
export const fetchSeries = () => fetchMerged<Series>(`${BASE}/series.json`, "series");
