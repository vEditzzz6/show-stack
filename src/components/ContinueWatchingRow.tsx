import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { motion } from "framer-motion";
import type { ContinueItem } from "@/lib/progress";

interface Props {
  items: ContinueItem[];
  onPlay: (item: ContinueItem) => void;
  onRemove: (id: string) => void;
}

export const ContinueWatchingRow = ({ items, onPlay, onRemove }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const scroll = (dir: "l" | "r") => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: (dir === "l" ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const remaining = (sec: number) => {
    const m = Math.max(1, Math.round(sec / 60));
    return m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h ${m % 60}m left`;
  };

  return (
    <section className="group/row relative px-6 py-6 md:px-16">
      <h2 className="mb-3 font-display text-2xl text-foreground md:text-3xl">Continue Watching</h2>
      <div className="relative">
        <button
          aria-label="Scroll left"
          onClick={() => scroll("l")}
          className="absolute left-0 top-0 z-20 flex h-full w-10 -translate-x-6 items-center justify-center rounded-l-md bg-background/70 opacity-0 transition-opacity hover:bg-background/90 group-hover/row:opacity-100 md:-translate-x-16"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div ref={ref} className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth pb-2 md:gap-4">
          {items.map((it) => {
            const remainingSec = Math.max(0, it.progress.duration - it.progress.position);
            return (
              <motion.div
                key={it.id}
                whileHover={{ scale: 1.04, y: -4, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative aspect-video w-[260px] flex-shrink-0 overflow-hidden rounded-md bg-muted shadow-card md:w-[320px]"
              >
                <button
                  onClick={() => onPlay(it)}
                  className="absolute inset-0 block text-left"
                  aria-label={`Resume ${it.title}`}
                >
                  {it.poster ? (
                    <img
                      src={it.poster}
                      alt={it.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary text-center text-xs text-muted-foreground">
                      {it.title}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                        <Play className="h-4 w-4 fill-current" />
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{it.title}</p>
                        {it.subtitle && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{it.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/20">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${it.percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{remaining(remainingSec)}</p>
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(it.id);
                  }}
                  aria-label={`Remove ${it.title} from Continue Watching`}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
        <button
          aria-label="Scroll right"
          onClick={() => scroll("r")}
          className="absolute right-0 top-0 z-20 flex h-full w-10 translate-x-6 items-center justify-center rounded-r-md bg-background/70 opacity-0 transition-opacity hover:bg-background/90 group-hover/row:opacity-100 md:translate-x-16"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
};
