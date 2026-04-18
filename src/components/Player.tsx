import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import { getProgress, makeId, saveProgress } from "@/lib/progress";

interface PlayerProps {
  open: boolean;
  url: string | null;
  title?: string;
  onOpenChange: (v: boolean) => void;
}

export const Player = ({ open, url, title, onOpenChange }: PlayerProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const idRef = useRef<string>("");

  useEffect(() => {
    const video = ref.current;
    if (!video || !url || !open) return;

    const id = makeId(url);
    idRef.current = id;
    const isHls = /\.m3u8(\?|$)/i.test(url);

    // Reset previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const tryPlay = () => {
      // Resume from saved position before playing.
      const saved = getProgress(id);
      if (saved && saved.position > 5 && (!video.duration || saved.position < video.duration - 10)) {
        try {
          video.currentTime = saved.position;
        } catch {
          /* will retry once metadata is loaded */
        }
      }
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          // Autoplay blocked — surface a hint; user can press play.
          toast("Tap play to start — your browser blocked autoplay.");
        });
      }
    };

    const onLoadedMeta = () => {
      const saved = getProgress(id);
      if (saved && saved.position > 5 && saved.position < video.duration - 10) {
        video.currentTime = saved.position;
      }
    };

    const onTime = () => {
      saveProgress(idRef.current, video.currentTime, video.duration || 0);
    };

    const onError = () => {
      toast.error("Playback failed. The file format may not be supported in browsers (e.g. .mkv).");
    };

    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("error", onError);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) onError();
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      // Native (MP4/WebM, or Safari's built-in HLS).
      video.src = url;
      // Wait until the browser thinks it can play, then start.
      const onCanPlay = () => {
        video.removeEventListener("canplay", onCanPlay);
        tryPlay();
      };
      video.addEventListener("canplay", onCanPlay);
      video.load();
    }

    return () => {
      // Persist final position for this item.
      if (video.duration) {
        saveProgress(idRef.current, video.currentTime, video.duration);
      }
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("error", onError);
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
          preload="auto"
          className="aspect-video w-full bg-black"
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
};
