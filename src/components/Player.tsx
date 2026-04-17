import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface PlayerProps {
  open: boolean;
  url: string | null;
  title?: string;
  onOpenChange: (v: boolean) => void;
}

export const Player = ({ open, url, title, onOpenChange }: PlayerProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !url || !open) return;

    const isHls = /\.m3u8(\?|$)/i.test(url);

    // Cleanup any previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else {
      // Native (MP4/WebM, or Safari which has built-in HLS)
      video.src = url;
    }

    video.play().catch(() => {
      /* autoplay can be blocked; user can press play */
    });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [url, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-none bg-background p-0">
        <video
          ref={ref}
          controls
          playsInline
          className="aspect-video w-full bg-black"
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
};
