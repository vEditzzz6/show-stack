import { useState } from "react";
import { Search } from "lucide-react";

interface NavbarProps {
  active: "films" | "series";
  onChange: (v: "films" | "series") => void;
  query: string;
  onQuery: (v: string) => void;
}

export const Navbar = ({ active, onChange, query, onQuery }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false);

  if (typeof window !== "undefined") {
    window.onscroll = () => setScrolled(window.scrollY > 40);
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur" : "bg-gradient-to-b from-background/90 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-4 md:px-16">
        <div className="flex items-center gap-8">
          <a href="/" className="font-display text-2xl tracking-widest text-primary md:text-3xl">
            VSTREAMZZZ
          </a>
          <nav className="hidden gap-6 md:flex">
            {(["films", "series"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onChange(tab)}
                className={`text-sm font-medium uppercase tracking-wider transition-colors ${
                  active === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-sm border border-border bg-background/70 px-3 py-1.5 backdrop-blur md:flex">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Titles, genres"
              className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-4 px-6 pb-3 md:hidden">
        {(["films", "series"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`text-xs font-semibold uppercase tracking-wider ${
              active === tab ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  );
};
