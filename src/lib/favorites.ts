// Lightweight favorites/My List store (localStorage).
import { makeId } from "./progress";

const KEY = "vstreamzzz:favorites:v1";

export type FavoriteKind = "film" | "series";

export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  title: string;
  poster?: string;
  subtitle?: string;
  // For films we store the stream so we can play directly.
  stream?: string;
  // For series we store the title so we can re-resolve from the catalog.
  seriesTitle?: string;
  addedAt: number;
}

type FavMap = Record<string, FavoriteItem>;

const read = (): FavMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as FavMap;
  } catch {
    return {};
  }
};

const write = (v: FavMap) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export const favoriteIdFor = (kind: FavoriteKind, key: string) =>
  `${kind}:${makeId(key)}`;

export const listFavorites = (): FavoriteItem[] =>
  Object.values(read()).sort((a, b) => b.addedAt - a.addedAt);

export const isFavorite = (id: string): boolean => !!read()[id];

export const addFavorite = (item: Omit<FavoriteItem, "addedAt">) => {
  const map = read();
  map[item.id] = { ...item, addedAt: Date.now() };
  write(map);
};

export const removeFavorite = (id: string) => {
  const map = read();
  delete map[id];
  write(map);
};

export const toggleFavorite = (item: Omit<FavoriteItem, "addedAt">): boolean => {
  if (isFavorite(item.id)) {
    removeFavorite(item.id);
    return false;
  }
  addFavorite(item);
  return true;
};
