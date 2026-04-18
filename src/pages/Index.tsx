import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { SeriesDetail } from "@/components/SeriesDetail";
import { FilmDetail } from "@/components/FilmDetail";
import { Player } from "@/components/Player";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { fetchFilms, fetchSeries, type Film, type Series } from "@/lib/catalog";
import {
  getProgress,
  listContinueWatching,
  makeId,
  removeProgress,
  upsertMeta,
  type ContinueItem,
} from "@/lib/progress";
import {
  favoriteIdFor,
  isFavorite as isFav,
  listFavorites,
  toggleFavorite,
  type FavoriteItem,
} from "@/lib/favorites";

// Demo fallback so the UI shines even before films.json/series.json are live.
const DEMO_FILMS: Film[] = Array.from({ length: 12 }).map((_, i) => ({
  title: `Demo Film ${i + 1}`,
  poster: "",
  group: ["Action", "Drama", "Sci-Fi", "Comedy"][i % 4],
  year: String(2018 + (i % 7)),
  stream: "",
}));

const DEMO_SERIES: Series[] = Array.from({ length: 8 }).map((_, i) => ({
  title: `Demo Series ${i + 1}`,
  poster: "",
  seasons: [
    { season: 1, episodes: Array.from({ length: 6 }).map((__, j) => ({ episode: j + 1, title: `Episode ${j + 1}`, stream: "" })) },
  ],
}));

const Index = () => {
  const [active, setActive] = useState<"films" | "series">("films");
  const [query, setQuery] = useState("");
  const [films, setFilms] = useState<Film[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const refreshContinue = useCallback(() => {
    setContinueItems(listContinueWatching());
  }, []);

  const refreshFavorites = useCallback(() => {
    setFavorites(listFavorites());
  }, []);

  const reloadCatalog = useCallback(() => {
    fetchFilms().then((d) => setFilms(d.length ? d : DEMO_FILMS));
    fetchSeries().then((d) => setSeries(d.length ? d : DEMO_SERIES));
  }, []);

  useEffect(() => {
    reloadCatalog();
    refreshContinue();
    refreshFavorites();
    const onSourcesChanged = () => reloadCatalog();
    window.addEventListener("vstreamzzz:sources-changed", onSourcesChanged);
    return () => window.removeEventListener("vstreamzzz:sources-changed", onSourcesChanged);
  }, [reloadCatalog, refreshContinue, refreshFavorites]);

  // Refresh Continue Watching whenever the player closes.
  useEffect(() => {
    if (!playUrl) refreshContinue();
  }, [playUrl, refreshContinue]);

  const playFilm = useCallback((film: Film) => {
    if (!film.stream) return;
    upsertMeta({
      id: makeId(film.stream),
      kind: "film",
      title: film.title,
      poster: film.backdrop || film.poster,
      subtitle: film.year ?? undefined,
      stream: film.stream,
      filmTitle: film.title,
    });
    setPlayUrl(film.stream);
  }, []);

  const playEpisode = useCallback(
    (s: Series, seasonNum: number, ep: { episode: number | null; title: string; stream: string; still?: string }) => {
      if (!ep.stream) return;
      upsertMeta({
        id: makeId(ep.stream),
        kind: "episode",
        title: s.title,
        poster: ep.still || s.backdrop || s.poster,
        subtitle: `S${seasonNum} · E${ep.episode ?? ""} — ${ep.title}`,
        stream: ep.stream,
        seriesTitle: s.title,
        season: seasonNum,
        episode: ep.episode,
      });
      setPlayUrl(ep.stream);
    },
    []
  );

  // Films grouped by category
  const filmGroups = useMemo(() => {
    const filtered = query
      ? films.filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
      : films;
    const map: Record<string, Film[]> = {};
    filtered.forEach((f) => {
      (map[f.group] ||= []).push(f);
    });
    return map;
  }, [films, query]);

  const filteredSeries = useMemo(
    () => (query ? series.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())) : series),
    [series, query]
  );

  const heroFilm = films[0];
  const heroSeries = series[0];

  const handleContinuePlay = (item: ContinueItem) => {
    // Re-register meta in case the title changed and resume.
    upsertMeta(item);
    setPlayUrl(item.stream);
  };

  const handleContinueRemove = (id: string) => {
    removeProgress(id);
    refreshContinue();
  };

  // ---- Favorites helpers ----
  const filmFavId = (f: Film) => favoriteIdFor("film", f.stream || f.title);
  const seriesFavId = (s: Series) => favoriteIdFor("series", s.title);

  const toggleFilmFav = (f: Film) => {
    toggleFavorite({
      id: filmFavId(f),
      kind: "film",
      title: f.title,
      poster: f.poster,
      subtitle: f.year ?? undefined,
      stream: f.stream,
    });
    refreshFavorites();
  };

  const toggleSeriesFav = (s: Series) => {
    toggleFavorite({
      id: seriesFavId(s),
      kind: "series",
      title: s.title,
      poster: s.poster,
      subtitle: `${s.seasons.length} season${s.seasons.length === 1 ? "" : "s"}`,
      seriesTitle: s.title,
    });
    refreshFavorites();
  };

  // Film stream URL → 0-100 progress (for poster overlay).
  const filmProgress = (f: Film): number | undefined => {
    if (!f.stream) return undefined;
    const p = getProgress(makeId(f.stream));
    if (!p) return undefined;
    return Math.min(100, Math.max(0, (p.position / p.duration) * 100));
  };

  // Series progress = max progress across all its episodes.
  const seriesProgress = (s: Series): number | undefined => {
    let best = 0;
    for (const season of s.seasons) {
      for (const ep of season.episodes) {
        if (!ep.stream) continue;
        const p = getProgress(makeId(ep.stream));
        if (p && p.duration > 0) {
          best = Math.max(best, (p.position / p.duration) * 100);
        }
      }
    }
    return best > 0 ? Math.min(100, best) : undefined;
  };

  // Resolve favorite items for current tab into PosterItems + handlers.
  const favFilms = useMemo(
    () => favorites.filter((f) => f.kind === "film"),
    [favorites]
  );
  const favSeries = useMemo(
    () => favorites.filter((f) => f.kind === "series"),
    [favorites]
  );

  const handleFavFilmSelect = (i: number) => {
    const fav = favFilms[i];
    const match = films.find((f) => f.stream === fav.stream) || {
      title: fav.title,
      poster: fav.poster ?? "",
      group: "My List",
      year: null,
      stream: fav.stream ?? "",
    } as Film;
    setSelectedFilm(match);
  };

  const handleFavSeriesSelect = (i: number) => {
    const fav = favSeries[i];
    const match = series.find((s) => s.title === fav.seriesTitle);
    if (match) setSelectedSeries(match);
  };


  return (
    <main className="min-h-screen bg-background">
      <Navbar active={active} onChange={setActive} query={query} onQuery={setQuery} />

      {active === "films" ? (
        <>
          <Hero
            title={heroFilm?.title ?? "Your Library, Cinematic."}
            tagline={heroFilm?.overview || "Stream films pulled straight from your Vstreamzzz collection. Posters and metadata enriched automatically."}
            poster={heroFilm?.backdrop || heroFilm?.poster}
            onPlay={() => heroFilm && playFilm(heroFilm)}
            onInfo={() => heroFilm && setSelectedFilm(heroFilm)}
          />
          <div className="-mt-24 relative z-10">
            <ContinueWatchingRow
              items={continueItems}
              onPlay={handleContinuePlay}
              onRemove={handleContinueRemove}
            />
            {favFilms.length > 0 && (
              <Row
                title="My List"
                items={favFilms.map((f) => ({
                  title: f.title,
                  poster: f.poster ?? "",
                  subtitle: f.subtitle,
                }))}
                onSelect={handleFavFilmSelect}
                isFavorite={() => true}
                onToggleFavorite={(i) => {
                  const fav = favFilms[i];
                  const match = films.find((f) => f.stream === fav.stream);
                  if (match) toggleFilmFav(match);
                }}
              />
            )}
            {Object.entries(filmGroups).map(([group, items]) => (
              <Row
                key={group}
                title={group}
                items={items.map((f) => ({
                  title: f.title,
                  poster: f.poster,
                  subtitle: f.year ?? undefined,
                  progress: filmProgress(f),
                }))}
                onSelect={(i) => setSelectedFilm(items[i])}
                isFavorite={(i) => isFav(filmFavId(items[i]))}
                onToggleFavorite={(i) => toggleFilmFav(items[i])}
              />
            ))}
            {!Object.keys(filmGroups).length && (
              <p className="px-6 py-24 text-center text-muted-foreground md:px-16">
                No films found{query ? ` for "${query}"` : ""}.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <Hero
            title={heroSeries?.title ?? "Binge Without Limits."}
            tagline={heroSeries?.overview || "Every season, every episode — organized and ready to play. Pulled live from your Series library."}
            poster={heroSeries?.backdrop || heroSeries?.poster}
            onInfo={() => heroSeries && setSelectedSeries(heroSeries)}
            onPlay={() => {
              const firstSeason = heroSeries?.seasons[0];
              const firstEp = firstSeason?.episodes[0];
              if (heroSeries && firstSeason && firstEp) {
                playEpisode(heroSeries, firstSeason.season, firstEp);
              }
            }}
          />
          <div className="-mt-24 relative z-10">
            <ContinueWatchingRow
              items={continueItems}
              onPlay={handleContinuePlay}
              onRemove={handleContinueRemove}
            />
            {favSeries.length > 0 && (
              <Row
                title="My List"
                items={favSeries.map((f) => ({
                  title: f.title,
                  poster: f.poster ?? "",
                  subtitle: f.subtitle,
                }))}
                onSelect={handleFavSeriesSelect}
                isFavorite={() => true}
                onToggleFavorite={(i) => {
                  const fav = favSeries[i];
                  const match = series.find((s) => s.title === fav.seriesTitle);
                  if (match) toggleSeriesFav(match);
                }}
              />
            )}
            <Row
              title="All Series"
              items={filteredSeries.map((s) => ({
                title: s.title,
                poster: s.poster,
                subtitle: `${s.seasons.length} season${s.seasons.length === 1 ? "" : "s"}`,
                progress: seriesProgress(s),
              }))}
              onSelect={(i) => setSelectedSeries(filteredSeries[i])}
              isFavorite={(i) => isFav(seriesFavId(filteredSeries[i]))}
              onToggleFavorite={(i) => toggleSeriesFav(filteredSeries[i])}
            />
            {!filteredSeries.length && (
              <p className="px-6 py-24 text-center text-muted-foreground md:px-16">
                No series found{query ? ` for "${query}"` : ""}.
              </p>
            )}
          </div>
        </>
      )}

      <footer className="border-t border-border/60 px-6 py-10 text-center text-xs text-muted-foreground md:px-16">
        Vstreamzzz — Personal media library. Powered by your build_playlist.php.
      </footer>

      <FilmDetail
        open={!!selectedFilm}
        film={selectedFilm}
        onOpenChange={(v) => !v && setSelectedFilm(null)}
        onPlay={(url) => {
          if (selectedFilm) {
            playFilm({ ...selectedFilm, stream: url });
          } else {
            setPlayUrl(url);
          }
          setSelectedFilm(null);
        }}
      />
      <SeriesDetail
        open={!!selectedSeries}
        series={selectedSeries}
        onOpenChange={(v) => !v && setSelectedSeries(null)}
        onPlay={(url) => {
          if (selectedSeries) {
            for (const season of selectedSeries.seasons) {
              const ep = season.episodes.find((e) => e.stream === url);
              if (ep) {
                playEpisode(selectedSeries, season.season, ep);
                setSelectedSeries(null);
                return;
              }
            }
          }
          setSelectedSeries(null);
          setPlayUrl(url);
        }}
      />
      <Player open={!!playUrl} url={playUrl} onOpenChange={(v) => !v && setPlayUrl(null)} />
    </main>
  );
};

export default Index;
