import { motion } from "framer-motion";
import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-backdrop.jpg";

interface HeroProps {
  title: string;
  tagline: string;
  poster?: string;
  onPlay?: () => void;
  onInfo?: () => void;
}

export const Hero = ({ title, tagline, poster, onPlay, onInfo }: HeroProps) => {
  return (
    <section className="relative h-[85vh] min-h-[520px] w-full overflow-hidden">
      <img
        src={poster || heroImg}
        alt={title}
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-gradient-hero-side" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 flex h-full max-w-3xl flex-col justify-end px-6 pb-24 md:px-16"
      >
        <span className="mb-3 inline-flex w-fit items-center rounded-sm bg-primary/90 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground shadow-glow">
          Featured
        </span>
        <h1 className="font-display text-5xl leading-none text-foreground text-shadow-hero md:text-7xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground text-shadow-hero md:text-lg">
          {tagline}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={onPlay} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
            <Play className="h-5 w-5 fill-current" /> Play
          </Button>
          <Button size="lg" variant="secondary" onClick={onInfo} className="gap-2 bg-secondary/70 backdrop-blur hover:bg-secondary">
            <Info className="h-5 w-5" /> More Info
          </Button>
        </div>
      </motion.div>
    </section>
  );
};
