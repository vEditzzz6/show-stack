import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useRef } from "react";

interface PlayerProps {
  open: boolean;
  url: string | null;
  title?: string;
  onOpenChange: (v: boolean) => void;
}

export const Player = ({ open, url, title, onOpenChange }: PlayerProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open && ref.current) {
      ref.current.pause();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-none bg-background p-0">
        {url && (
          <video
            ref={ref}
            src={url}
            controls
            autoPlay
            className="aspect-video w-full bg-black"
            title={title}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
