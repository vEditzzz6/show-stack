import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { SeriesDetail } from "@/components/SeriesDetail";
import { Player } from "@/components/Player";
import { fetchFilms, fetchSeries, type Film, type Series } from "@/lib/catalog";

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
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFilms().then((d) => setFilms(d.length ? d : DEMO_FILMS));
    fetchSeries().then((d) => setSeries(d.length ? d : DEMO_SERIES));
  }, []);

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

  return (
    <main className="min-h-screen bg-background">
      <Navbar active={active} onChange={setActive} query={query} onQuery={setQuery} />

      {active === "films" ? (
        <>
          <Hero
            title={heroFilm?.title ?? "Your Library, Cinematic."}
            tagline="Stream films pulled straight from your Vstreamzzz collection. Posters and metadata enriched automatically."
            poster={heroFilm?.poster}
            onPlay={() => heroFilm?.stream && setPlayUrl(heroFilm.stream)}
          />
          <div className="-mt-24 relative z-10">
            {Object.entries(filmGroups).map(([group, items]) => (
              <Row
                key={group}
                title={group}
                items={items.map((f) => ({ title: f.title, poster: f.poster, subtitle: f.year ?? undefined }))}
                onSelect={(i) => items[i].stream && setPlayUrl(items[i].stream)}
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
            tagline="Every season, every episode — organized and ready to play. Pulled live from your Series library."
            poster={heroSeries?.poster}
            onInfo={() => heroSeries && setSelectedSeries(heroSeries)}
            onPlay={() => {
              const first = heroSeries?.seasons[0]?.episodes[0]?.stream;
              if (first) setPlayUrl(first);
            }}
          />
          <div className="-mt-24 relative z-10">
            <Row
              title="All Series"
              items={filteredSeries.map((s) => ({
                title: s.title,
                poster: s.poster,
                subtitle: `${s.seasons.length} season${s.seasons.length === 1 ? "" : "s"}`,
              }))}
              onSelect={(i) => setSelectedSeries(filteredSeries[i])}
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

      <SeriesDetail
        open={!!selectedSeries}
        series={selectedSeries}
        onOpenChange={(v) => !v && setSelectedSeries(null)}
        onPlay={(url) => {
          setSelectedSeries(null);
          setPlayUrl(url);
        }}
      />
      <Player open={!!playUrl} url={playUrl} onOpenChange={(v) => !v && setPlayUrl(null)} />
    </main>
  );
};

export default Index;
