// IPTV ingestion → converts M3U / Xtream Codes / Stalker portal / XMLTV
// payloads into the existing Film + Series schema used by the rest of the app.
// Live channels are intentionally NOT exposed as a separate tab — channels are
// dropped, only VOD movies and VOD series are surfaced.

import type { Film, Series, Episode } from "./catalog";

// ============================================================
// 1) M3U / M3U8 parsing
// ============================================================

export interface M3UEntry {
  url: string;
  name: string;
  attrs: Record<string, string>; // tvg-id, tvg-logo, tvg-name, group-title, ...
  duration: number; // seconds, -1 for live
}

const ATTR_RE = /([a-zA-Z0-9_-]+)="([^"]*)"/g;

export function parseM3U(text: string): M3UEntry[] {
  const lines = text.split(/\r?\n/);
  const out: M3UEntry[] = [];
  let pending: { name: string; attrs: Record<string, string>; duration: number } | null = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTM3U")) continue;
    if (line.startsWith("#EXTINF")) {
      // #EXTINF:<duration> <attr="val">,<title>
      const comma = line.indexOf(",");
      const head = comma >= 0 ? line.slice(0, comma) : line;
      const title = comma >= 0 ? line.slice(comma + 1).trim() : "";
      const durMatch = head.match(/#EXTINF:(-?[\d.]+)/);
      const duration = durMatch ? parseFloat(durMatch[1]) : -1;
      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      ATTR_RE.lastIndex = 0;
      while ((m = ATTR_RE.exec(head))) attrs[m[1].toLowerCase()] = m[2];
      pending = { name: title || attrs["tvg-name"] || "Untitled", attrs, duration };
      continue;
    }
    if (line.startsWith("#")) continue; // skip other directives (#EXTGRP, #KODIPROP, etc.)
    if (pending) {
      out.push({ url: line, ...pending });
      pending = null;
    }
  }
  return out;
}

// ============================================================
// 2) Classification + grouping
// ============================================================

const VIDEO_EXT_RE = /\.(mp4|mkv|avi|mov|webm|m4v|ts|flv|wmv)(\?|$)/i;
const HLS_RE = /\.m3u8(\?|$)/i;
const SERIES_PATH_RE = /\/series\//i;
const MOVIE_PATH_RE = /\/movie\//i;
const LIVE_PATH_RE = /\/live\//i;

// "Show Name S01E02 - Title" / "Show Name 1x02" / "Show.Name.s01.e02"
const EP_RE_1 = /^(.*?)[\s._-]+s(\d{1,3})[\s._-]?e(\d{1,3})\b(.*)$/i;
const EP_RE_2 = /^(.*?)[\s._-]+(\d{1,3})x(\d{1,3})\b(.*)$/i;

interface EpisodeMatch {
  series: string;
  season: number;
  episode: number;
  rest: string;
}

function detectEpisode(name: string): EpisodeMatch | null {
  let m = name.match(EP_RE_1);
  if (!m) m = name.match(EP_RE_2);
  if (!m) return null;
  const series = m[1].replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
  if (!series) return null;
  return {
    series,
    season: parseInt(m[2], 10),
    episode: parseInt(m[3], 10),
    rest: (m[4] || "").replace(/[._]/g, " ").replace(/^[\s\-:]+/, "").trim(),
  };
}

export type EntryKind = "live" | "movie" | "series" | "unknown";

export function classify(e: M3UEntry): EntryKind {
  const url = e.url.toLowerCase();
  if (LIVE_PATH_RE.test(url)) return "live";
  if (SERIES_PATH_RE.test(url)) return "series";
  if (MOVIE_PATH_RE.test(url)) return "movie";
  // Xtream often has /series/.../S01E02.mkv — also rely on title
  if (detectEpisode(e.name)) return "series";
  if (VIDEO_EXT_RE.test(url)) return "movie";
  if (HLS_RE.test(url)) return "live"; // bare HLS without context = treat as live, drop
  return "unknown";
}

export interface ConvertResult {
  films: Film[];
  series: Series[];
  skipped: { live: number; unknown: number };
}

// Turn a flat list of M3U entries into Film[] + Series[]. Episodes are grouped
// by detected series title + season number.
export function entriesToCatalog(entries: M3UEntry[]): ConvertResult {
  const films: Film[] = [];
  const seriesMap = new Map<string, Series>();
  const skipped = { live: 0, unknown: 0 };

  const seenFilm = new Set<string>();
  const seenEp = new Set<string>(); // `${seriesKey}|s${season}e${ep}`

  for (const e of entries) {
    const kind = classify(e);
    if (kind === "live") {
      skipped.live++;
      continue;
    }
    if (kind === "unknown") {
      skipped.unknown++;
      continue;
    }

    if (kind === "series") {
      const m = detectEpisode(e.name) || {
        series: e.attrs["group-title"] || "Unknown Series",
        season: 1,
        episode: 0,
        rest: e.name,
      };
      const key = m.series.toLowerCase();
      const epKey = `${key}|s${m.season}e${m.episode}`;
      if (seenEp.has(epKey)) continue;
      seenEp.add(epKey);

      let s = seriesMap.get(key);
      if (!s) {
        s = {
          title: m.series,
          poster: e.attrs["tvg-logo"] || "",
          genres: e.attrs["group-title"] ? [e.attrs["group-title"]] : undefined,
          seasons: [],
        };
        seriesMap.set(key, s);
      }
      let season = s.seasons.find((x) => x.season === m.season);
      if (!season) {
        season = { season: m.season, episodes: [] };
        s.seasons.push(season);
      }
      const ep: Episode = {
        episode: m.episode || null,
        title: m.rest || `Episode ${m.episode || season.episodes.length + 1}`,
        stream: e.url,
        still: e.attrs["tvg-logo"] || undefined,
      };
      season.episodes.push(ep);
      continue;
    }

    // Film
    const filmKey = (e.name || e.url).toLowerCase().trim();
    if (seenFilm.has(filmKey)) continue;
    seenFilm.add(filmKey);

    const yearMatch = e.name.match(/\((\d{4})\)/) || e.name.match(/\b(19|20)\d{2}\b/);
    films.push({
      title: e.name.replace(/\s*\(\d{4}\)\s*/, "").trim() || e.name,
      poster: e.attrs["tvg-logo"] || "",
      year: yearMatch ? yearMatch[0].replace(/[()]/g, "") : null,
      group: e.attrs["group-title"] || "Movies",
      stream: e.url,
    });
  }

  // Sort each series' seasons + episodes deterministically.
  for (const s of seriesMap.values()) {
    s.seasons.sort((a, b) => a.season - b.season);
    for (const season of s.seasons) {
      season.episodes.sort(
        (a, b) => (a.episode ?? 0) - (b.episode ?? 0)
      );
    }
  }

  return { films, series: Array.from(seriesMap.values()), skipped };
}

// ============================================================
// 3) Fetching helpers — M3U URL, Xtream Codes, Stalker portal
// ============================================================

export interface XtreamCreds {
  host: string; // e.g. http://line.example.com:8080
  username: string;
  password: string;
}

const cleanHost = (h: string) => h.trim().replace(/\/+$/, "");

export async function fetchM3U(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Playlist HTTP ${res.status}`);
  return await res.text();
}

// Build the standard Xtream get.php playlist URL — works with virtually every
// Xtream Codes / IPTV reseller panel.
export function xtreamPlaylistUrl(c: XtreamCreds): string {
  const h = cleanHost(c.host);
  const u = encodeURIComponent(c.username);
  const p = encodeURIComponent(c.password);
  return `${h}/get.php?username=${u}&password=${p}&type=m3u_plus&output=ts`;
}

// Pull the Xtream JSON catalog directly (richer metadata) and convert.
// We call categories + streams + series endpoints and assemble Film[]/Series[].
export async function fetchXtreamCatalog(c: XtreamCreds): Promise<ConvertResult> {
  const h = cleanHost(c.host);
  const u = encodeURIComponent(c.username);
  const p = encodeURIComponent(c.password);
  const base = `${h}/player_api.php?username=${u}&password=${p}`;

  const j = async <T,>(action: string, extra = ""): Promise<T> => {
    const res = await fetch(`${base}&action=${action}${extra}`, { mode: "cors" });
    if (!res.ok) throw new Error(`Xtream ${action} HTTP ${res.status}`);
    return (await res.json()) as T;
  };

  const [vodCats, vodStreams, seriesCats, seriesList] = await Promise.all([
    j<Array<{ category_id: string; category_name: string }>>("get_vod_categories").catch(() => []),
    j<Array<{
      stream_id: number;
      name: string;
      stream_icon?: string;
      category_id?: string;
      container_extension?: string;
      year?: string;
      rating?: string | number;
    }>>("get_vod_streams").catch(() => []),
    j<Array<{ category_id: string; category_name: string }>>("get_series_categories").catch(() => []),
    j<Array<{
      series_id: number;
      name: string;
      cover?: string;
      plot?: string;
      genre?: string;
      releaseDate?: string;
      rating?: string | number;
      category_id?: string;
    }>>("get_series").catch(() => []),
  ]);

  const vodCatMap = new Map<string, string>(
    vodCats.map((c) => [String(c.category_id), c.category_name] as [string, string])
  );
  // seriesCatMap reserved for future series category surfacing
  void seriesCats;

  const films: Film[] = vodStreams.map((s) => ({
    title: s.name,
    poster: s.stream_icon || "",
    year: s.year ?? null,
    rating: typeof s.rating === "string" ? parseFloat(s.rating) || null : s.rating ?? null,
    group: vodCatMap.get(String(s.category_id ?? "")) || "Movies",
    stream: `${h}/movie/${c.username}/${c.password}/${s.stream_id}.${s.container_extension || "mp4"}`,
  }));

  // Series: fetch episodes lazily? For correctness we resolve every series via
  // get_series_info — but to avoid hammering the panel we cap concurrency.
  const series: Series[] = [];
  const concurrency = 6;
  let idx = 0;
  await Promise.all(
    Array.from({ length: concurrency }).map(async () => {
      while (idx < seriesList.length) {
        const i = idx++;
        const s = seriesList[i];
        try {
          const info = await j<{
            episodes?: Record<string, Array<{
              id: string;
              episode_num: number;
              title: string;
              container_extension?: string;
              info?: { plot?: string; releasedate?: string; movie_image?: string };
            }>>;
          }>("get_series_info", `&series_id=${s.series_id}`);
          const seasons = Object.entries(info.episodes || {})
            .map(([num, eps]) => ({
              season: parseInt(num, 10) || 0,
              episodes: eps.map((e) => ({
                episode: e.episode_num,
                title: e.title,
                stream: `${h}/series/${c.username}/${c.password}/${e.id}.${e.container_extension || "mp4"}`,
                overview: e.info?.plot,
                air_date: e.info?.releasedate ?? null,
                still: e.info?.movie_image,
              })),
            }))
            .sort((a, b) => a.season - b.season);
          if (!seasons.length) continue;
          series.push({
            title: s.name,
            poster: s.cover || "",
            overview: s.plot,
            rating: typeof s.rating === "string" ? parseFloat(s.rating) || null : s.rating ?? null,
            year: s.releaseDate ? s.releaseDate.slice(0, 4) : null,
            genres: s.genre ? s.genre.split(/[,/|]/).map((g) => g.trim()).filter(Boolean) : undefined,
            seasons,
          });
        } catch {
          /* skip series we can't resolve */
        }
      }
    })
  );

  return { films, series, skipped: { live: 0, unknown: 0 } };
}

// ============================================================
// 4) Stalker / MAC portal — best-effort
// ============================================================
// Stalker portals are notoriously hostile to browsers (CORS + cookie auth).
// We expose a function that attempts the standard handshake and dumps the
// channel list as M3U-ish entries, but most public portals will fail in the
// browser. The user is warned in the UI.

export interface StalkerCreds {
  portal: string; // e.g. http://portal.example.com/c/
  mac: string; // 00:1A:79:XX:XX:XX
}

export async function fetchStalkerPlaylist(c: StalkerCreds): Promise<string> {
  const portal = cleanHost(c.portal);
  const headers: HeadersInit = {
    Cookie: `mac=${encodeURIComponent(c.mac)}; stb_lang=en; timezone=UTC`,
    "User-Agent":
      "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 250 Safari/533.3",
  };
  // Handshake — get token
  const handshake = await fetch(
    `${portal}/portal.php?type=stb&action=handshake&JsHttpRequest=1-xml`,
    { headers, mode: "cors", credentials: "include" }
  );
  if (!handshake.ok) throw new Error(`Stalker handshake HTTP ${handshake.status}`);
  const hs = (await handshake.json()) as { js?: { token?: string } };
  const token = hs.js?.token;
  if (!token) throw new Error("Stalker handshake returned no token");

  const auth: HeadersInit = { ...headers, Authorization: `Bearer ${token}` };
  const itv = await fetch(
    `${portal}/portal.php?type=itv&action=get_all_channels&JsHttpRequest=1-xml`,
    { headers: auth, mode: "cors", credentials: "include" }
  );
  if (!itv.ok) throw new Error(`Stalker channels HTTP ${itv.status}`);
  const data = (await itv.json()) as {
    js?: { data?: Array<{ name: string; cmd: string; logo?: string; tv_genre_id?: string }> };
  };
  const list = data.js?.data || [];
  // Convert to M3U so the same parsing pipeline applies.
  let m3u = "#EXTM3U\n";
  for (const ch of list) {
    const cmd = ch.cmd.replace(/^ffmpeg\s+/, "").trim();
    m3u += `#EXTINF:-1 tvg-logo="${ch.logo || ""}" group-title="Stalker",${ch.name}\n${cmd}\n`;
  }
  return m3u;
}

// ============================================================
// 5) XMLTV EPG parsing → attach now/next + per-episode air dates
// ============================================================

export interface EpgProgramme {
  channel: string; // tvg-id
  title: string;
  desc?: string;
  start: Date;
  stop: Date;
}

export interface EpgData {
  channels: Map<string, { id: string; displayName: string; icon?: string }>;
  programmes: EpgProgramme[]; // flat list, sorted by start
  byChannel: Map<string, EpgProgramme[]>;
}

function parseXmltvDate(s: string): Date {
  // Format: 20240105143000 +0000  (or without TZ)
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);
  if (!m) return new Date(s);
  const [, y, mo, d, h, mi, se, tz] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}${
    tz ? `${tz.slice(0, 3)}:${tz.slice(3)}` : "Z"
  }`;
  return new Date(iso);
}

export function parseXmltv(xml: string): EpgData {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const channels = new Map<string, { id: string; displayName: string; icon?: string }>();
  for (const ch of Array.from(doc.getElementsByTagName("channel"))) {
    const id = ch.getAttribute("id") || "";
    if (!id) continue;
    const dn = ch.getElementsByTagName("display-name")[0]?.textContent?.trim() || id;
    const icon = ch.getElementsByTagName("icon")[0]?.getAttribute("src") || undefined;
    channels.set(id, { id, displayName: dn, icon });
  }
  const programmes: EpgProgramme[] = [];
  for (const p of Array.from(doc.getElementsByTagName("programme"))) {
    const channel = p.getAttribute("channel") || "";
    const start = p.getAttribute("start") || "";
    const stop = p.getAttribute("stop") || "";
    if (!channel || !start || !stop) continue;
    programmes.push({
      channel,
      title: p.getElementsByTagName("title")[0]?.textContent?.trim() || "",
      desc: p.getElementsByTagName("desc")[0]?.textContent?.trim() || undefined,
      start: parseXmltvDate(start),
      stop: parseXmltvDate(stop),
    });
  }
  programmes.sort((a, b) => a.start.getTime() - b.start.getTime());
  const byChannel = new Map<string, EpgProgramme[]>();
  for (const p of programmes) {
    const arr = byChannel.get(p.channel) || [];
    arr.push(p);
    byChannel.set(p.channel, arr);
  }
  return { channels, programmes, byChannel };
}

export async function fetchXmltv(url: string): Promise<EpgData> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`EPG HTTP ${res.status}`);
  const text = await res.text();
  return parseXmltv(text);
}
