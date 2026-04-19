import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import mpegts from "mpegts.js";
import { toast } from "sonner";
import { getProgress, makeId, saveProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";

interface PlayerProps {
  open: boolean;
  url: string | null;
  title?: string;
  onOpenChange: (v: boolean) => void;
}

type Diagnosis =
  | { kind: "ok" }
  | { kind: "mixed-content" }
  | { kind: "cors"; detail?: string }
  | { kind: "format"; ext: string }
  | { kind: "network"; detail?: string }
  | { kind: "unknown"; detail?: string };

const VISIBLY_HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

const getExt = (url: string) => {
  try {
    const u = new URL(url, window.location.href);
    const m = u.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    return m?.[1] ?? "";
  } catch {
    return "";
  }
};

export const Player = ({ open, url, title, onOpenChange }: PlayerProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const tsRef = useRef<mpegts.Player | null>(null);
  const idRef = useRef<string>("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis>({ kind: "ok" });

  useEffect(() => {
    if (!open) setDiagnosis({ kind: "ok" });
  }, [open]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !url || !open) return;

    const id = makeId(url);
    idRef.current = id;
    const ext = getExt(url);
    const isHls = ext === "m3u8" || /\.m3u8(\?|$)/i.test(url);
    const isTs = ext === "ts" || ext === "mpegts" || ext === "m2ts";
    const isMkv = ext === "mkv";

    // Mixed content check (https page → http stream)
    const isMixed =
      window.location.protocol === "https:" && /^http:\/\//i.test(url);
    if (isMixed) {
      setDiagnosis({ kind: "mixed-content" });
      toast.error("Stream uses http:// but page is https:// — browser blocks this.");
      return;
    }

    if (isMkv) {
      setDiagnosis({ kind: "format", ext });
      toast.error("MKV files cannot be played in browsers. Use VLC or convert to MP4.");
      return;
    }

    // Reset previous instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (tsRef.current) {
      try {
        tsRef.current.destroy();
      } catch {
        /* ignore */
      }
      tsRef.current = null;
    }

    setDiagnosis({ kind: "ok" });

    const tryPlay = () => {
      const saved = getProgress(id);
      if (saved && saved.position > 5 && (!video.duration || saved.position < video.duration - 10)) {
        try {
          video.currentTime = saved.position;
        } catch {
          /* will retry */
        }
      }
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
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
      const err = video.error;
      if (err?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        setDiagnosis({ kind: "format", ext: ext || "unknown" });
        toast.error(`Browser can't decode this stream (.${ext || "?"}). Try VLC.`);
      } else if (err?.code === MediaError.MEDIA_ERR_NETWORK) {
        setDiagnosis({ kind: "network", detail: err.message });
        toast.error("Network error fetching stream. Likely CORS or unreachable host.");
      } else {
        setDiagnosis({ kind: "unknown", detail: err?.message });
        toast.error("Playback failed. The stream may be offline, CORS-blocked, or unsupported.");
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("error", onError);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, xhrSetup: (xhr) => { xhr.withCredentials = false; } });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setDiagnosis({ kind: "cors", detail: data.details });
          toast.error("HLS network error — usually CORS. Provider must allow your origin.");
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setDiagnosis({ kind: "format", ext: "m3u8" });
          toast.error("HLS media error — codec may be unsupported in browsers.");
        } else {
          setDiagnosis({ kind: "unknown", detail: data.details });
          toast.error(`HLS fatal: ${data.details}`);
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (isTs && mpegts.getFeatureList().mseLivePlayback) {
      // Raw MPEG-TS via mpegts.js
      const player = mpegts.createPlayer(
        { type: "mpegts", isLive: false, url },
        { enableWorker: true, lazyLoad: false }
      );
      tsRef.current = player;
      player.attachMediaElement(video);
      player.on(mpegts.Events.ERROR, (type, detail) => {
        setDiagnosis({ kind: type === "NetworkError" ? "cors" : "unknown", detail });
        toast.error(`MPEG-TS: ${type} — ${detail}`);
      });
      player.load();
      const tsPlay = player.play() as unknown as Promise<void> | void;
      if (tsPlay && typeof (tsPlay as Promise<void>).catch === "function") {
        (tsPlay as Promise<void>).catch(() => toast("Tap play to start."));
      }
    } else {
      // Native MP4/WebM, or Safari's built-in HLS
      video.src = url;
      const onCanPlay = () => {
        video.removeEventListener("canplay", onCanPlay);
        tryPlay();
      };
      video.addEventListener("canplay", onCanPlay);
      video.load();
    }

    return () => {
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
      if (tsRef.current) {
        try {
          tsRef.current.pause();
          tsRef.current.unload();
          tsRef.current.detachMediaElement();
          tsRef.current.destroy();
        } catch {
          /* ignore */
        }
        tsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [url, open]);

  const copyUrl = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Stream URL copied"),
      () => toast.error("Could not copy")
    );
  };

  const renderDiagnosis = () => {
    if (diagnosis.kind === "ok") return null;
    const messages: Record<Diagnosis["kind"], string> = {
      ok: "",
      "mixed-content":
        "This stream uses http:// but the page is https://. Browsers block this. Open the app over http:// or ask the provider for an https:// endpoint.",
      cors: "The stream host doesn't allow your browser to fetch it (CORS). This is a provider-side restriction — there's no client-side fix. Try the stream in VLC.",
      format: `Browsers can't decode .${(diagnosis as { ext?: string }).ext ?? "?"} natively. Supported in-browser: MP4 (H.264/AAC), WebM, HLS (.m3u8), MPEG-TS (.ts). Anything else needs VLC or a transcoder.`,
      network: "Network error reaching the stream. The host may be offline or unreachable from your network.",
      unknown: "Playback failed for an unknown reason. Try copying the URL into VLC to test it.",
    };
    return (
      <div className="space-y-3 p-4 text-sm">
        <p className="text-destructive font-medium">Stream couldn't play</p>
        <p className="text-muted-foreground">{messages[diagnosis.kind]}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={copyUrl}>
            <Copy className="mr-1 h-3 w-3" /> Copy URL
          </Button>
          {url && (
            <Button asChild size="sm" variant="secondary">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Open directly
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-none bg-background p-0">
        <DialogTitle style={VISIBLY_HIDDEN}>{title ?? "Player"}</DialogTitle>
        <DialogDescription style={VISIBLY_HIDDEN}>
          Video player for the selected stream.
        </DialogDescription>
        <video
          ref={ref}
          controls
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="aspect-video w-full bg-black"
          title={title}
        />
        {renderDiagnosis()}
      </DialogContent>
    </Dialog>
  );
};
