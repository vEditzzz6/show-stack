import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Clock, Calendar } from "lucide-react";
import type { Film } from "@/lib/catalog";
import heroImg from "@/assets/hero-backdrop.jpg";

interface FilmDetailProps {
  open: boolean;
  film: Film | null;
  onOpenChange: (v: boolean) => void;
  onPlay: (streamUrl: string) => void;
}

const formatRuntime = (mins?: number | null) => {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export const FilmDetail = ({ open, film, onOpenChange, onPlay }: FilmDetailProps) => {
  if (!film) return null;
  const runtime = formatRuntime(film.runtime);
  const backdrop = film.backdrop || film.poster || heroImg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden border-border bg-card p-0 text-foreground">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img src={backdrop} alt={film.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 p-6">
            <DialogTitle className="font-display text-3xl text-shadow-hero md:text-5xl">
              {film.title}
            </DialogTitle>
            <Button
              size="lg"
              onClick={() => film.stream && onPlay(film.stream)}
              className="w-fit gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              <Play className="h-5 w-5 fill-current" /> Play
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-2">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {film.rating != null && (
              <span className="inline-flex items-center gap-1 text-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-semibold">{film.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">/10</span>
              </span>
            )}
            {film.year && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {film.year}
              </span>
            )}
            {runtime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> {runtime}
              </span>
            )}
            <Badge variant="outline" className="border-border/60">
              {film.group}
            </Badge>
          </div>

          {film.genres && film.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {film.genres.map((g) => (
                <Badge key={g} variant="secondary" className="bg-secondary/70">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {film.overview ? (
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {film.overview}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No synopsis available. Run build_playlist.php to enrich this title from TMDB.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
