import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play } from "lucide-react";
import type { Series } from "@/lib/catalog";

interface SeriesDetailProps {
  open: boolean;
  series: Series | null;
  onOpenChange: (v: boolean) => void;
  onPlay: (streamUrl: string) => void;
}

export const SeriesDetail = ({ open, series, onOpenChange, onPlay }: SeriesDetailProps) => {
  if (!series) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-border bg-card p-0 text-foreground">
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-t-lg">
          {series.poster ? (
            <img src={series.poster} alt={series.title} className="h-full w-full object-cover object-top" />
          ) : (
            <div className="h-full w-full bg-gradient-brand" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          <DialogHeader className="absolute bottom-4 left-6 text-left">
            <DialogTitle className="font-display text-4xl">{series.title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 pb-6">
          <Tabs defaultValue={String(series.seasons[0]?.season ?? 1)}>
            <TabsList className="mb-4 flex-wrap bg-secondary/50">
              {series.seasons.map((s) => (
                <TabsTrigger key={s.season} value={String(s.season)}>
                  Season {s.season}
                </TabsTrigger>
              ))}
            </TabsList>
            {series.seasons.map((s) => (
              <TabsContent key={s.season} value={String(s.season)} className="space-y-2">
                {s.episodes.map((ep, i) => (
                  <button
                    key={`${ep.stream}-${i}`}
                    onClick={() => onPlay(ep.stream)}
                    className="group flex w-full items-center gap-4 rounded-md border border-border/60 bg-secondary/40 p-3 text-left transition-colors hover:border-primary/60 hover:bg-secondary"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Play className="h-4 w-4 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Episode {ep.episode ?? i + 1}
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">{ep.title}</p>
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
