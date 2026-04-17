export interface Film {
  title: string;
  poster: string;
  group: string;
  year: string | null;
  stream: string;
}

export interface Episode {
  episode: number | null;
  title: string;
  stream: string;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface Series {
  title: string;
  poster: string;
  seasons: Season[];
}

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

export const fetchFilms = () => safeJson<Film[]>(`${BASE}/films.json`, []);
export const fetchSeries = () => safeJson<Series[]>(`${BASE}/series.json`, []);
