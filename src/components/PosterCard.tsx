import { motion } from "framer-motion";
import { Play } from "lucide-react";

export interface PosterItem {
  title: string;
  poster: string;
  subtitle?: string;
}

interface PosterCardProps {
  item: PosterItem;
  onClick?: () => void;
}

export const PosterCard = ({ item, onClick }: PosterCardProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.06, y: -4, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={onClick}
      className="group relative aspect-[2/3] w-[140px] flex-shrink-0 overflow-hidden rounded-md bg-muted shadow-card md:w-[180px]"
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

      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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
    </motion.button>
  );
};
