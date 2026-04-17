import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Calendar } from "lucide-react";
import type { Series } from "@/lib/catalog";
import heroImg from "@/assets/hero-backdrop.jpg";

interface SeriesDetailProps {
  open: boolean;
  series: Series | null;
  onOpenChange: (v: boolean) => void;
  onPlay: (streamUrl: string) => void;
}

export const SeriesDetail = ({ open, series, onOpenChange, onPlay }: SeriesDetailProps) => {
  if (!series) return null;
  const backdrop = series.backdrop || series.poster || heroImg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden border-border bg-card p-0 text-foreground">
        <div className="relative aspect-[16/8] w-full overflow-hidden">
          <img src={backdrop} alt={series.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          <DialogTitle className="absolute bottom-4 left-6 right-6 text-left font-display text-3xl text-shadow-hero md:text-5xl">
            {series.title}
          </DialogTitle>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 pb-6 pt-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {series.rating != null && (
              <span className="inline-flex items-center gap-1 text-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-semibold">{series.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">/10</span>
              </span>
            )}
            {series.year && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {series.year}
              </span>
            )}
            <Badge variant="outline" className="border-border/60">
              {series.seasons.length} season{series.seasons.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {series.genres && series.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {series.genres.map((g) => (
                <Badge key={g} variant="secondary" className="bg-secondary/70">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {series.overview && (
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {series.overview}
            </p>
          )}

          <Tabs defaultValue={String(series.seasons[0]?.season ?? 1)}>
            <TabsList className="mb-4 flex-wrap bg-secondary/50">
              {series.seasons.map((s) => (
                <TabsTrigger key={s.season} value={String(s.season)}>
                  Season {s.season}
                </TabsTrigger>
              ))}
            </TabsList>
            {series.seasons.map((s) => (
              <TabsContent key={s.season} value={String(s.season)} className="space-y-3">
                {s.episodes.map((ep, i) => (
                  <button
                    key={`${ep.stream}-${i}`}
                    onClick={() => onPlay(ep.stream)}
                    className="group flex w-full gap-4 rounded-md border border-border/60 bg-secondary/40 p-3 text-left transition-colors hover:border-primary/60 hover:bg-secondary"
                  >
                    <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded bg-background">
                      {ep.still ? (
                        <img src={ep.still} alt={ep.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-brand">
                          <Play className="h-6 w-6 text-primary-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-8 w-8 fill-current text-foreground" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          <span className="text-muted-foreground">{ep.episode ?? i + 1}.</span> {ep.title}
                        </p>
                        {ep.air_date && (
                          <span className="shrink-0 text-xs text-muted-foreground">{ep.air_date}</span>
                        )}
                      </div>
                      {ep.overview && (
                        <p className="line-clamp-2 text-xs text-muted-foreground md:text-sm">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
