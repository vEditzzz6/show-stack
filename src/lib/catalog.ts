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
