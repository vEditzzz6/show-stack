import { motion } from "framer-motion";
import { Play, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PosterItem {
  title: string;
  poster: string;
  subtitle?: string;
  /** 0-100 percent watched, shown as a thin bar at the bottom of the poster. */
  progress?: number;
}

interface PosterCardProps {
  item: PosterItem;
  onClick?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const PosterCard = ({ item, onClick, isFavorite, onToggleFavorite }: PosterCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.06, y: -4, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative aspect-[2/3] w-[140px] flex-shrink-0 overflow-hidden rounded-md bg-muted shadow-card md:w-[180px]"
    >
      <button
        onClick={onClick}
        aria-label={`Open ${item.title}`}
        className="block h-full w-full text-left"
      >
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-center text-xs text-muted-foreground">
            {item.title}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
          </div>
          {item.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
          )}
        </div>
      </button>

      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={isFavorite ? "Remove from My List" : "Add to My List"}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur transition-all hover:bg-background",
            "opacity-0 group-hover:opacity-100",
            isFavorite && "opacity-100 border-primary/60 text-primary"
          )}
        >
          {isFavorite ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      )}

      {typeof item.progress === "number" && item.progress > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-background/60">
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};
