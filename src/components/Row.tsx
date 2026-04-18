import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PosterCard, PosterItem } from "./PosterCard";

interface RowProps {
  title: string;
  items: PosterItem[];
  onSelect?: (index: number) => void;
  isFavorite?: (index: number) => boolean;
  onToggleFavorite?: (index: number) => void;
}

export const Row = ({ title, items, onSelect, isFavorite, onToggleFavorite }: RowProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "l" | "r") => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: (dir === "l" ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="group/row relative px-6 py-6 md:px-16">
      <h2 className="mb-3 font-display text-2xl text-foreground md:text-3xl">{title}</h2>
      <div className="relative">
        <button
          aria-label="Scroll left"
          onClick={() => scroll("l")}
          className="absolute left-0 top-0 z-20 flex h-full w-10 -translate-x-6 items-center justify-center rounded-l-md bg-background/70 opacity-0 transition-opacity hover:bg-background/90 group-hover/row:opacity-100 md:-translate-x-16"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div
          ref={ref}
          className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth pb-2 md:gap-4"
        >
          {items.map((item, i) => (
            <PosterCard
              key={`${item.title}-${i}`}
              item={item}
              onClick={() => onSelect?.(i)}
              isFavorite={isFavorite?.(i)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(i) : undefined}
            />
          ))}
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
