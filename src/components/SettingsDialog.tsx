import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  Trash2,
  Plus,
  Link as LinkIcon,
  Upload,
  Download,
  Wand2,
  FileJson,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  addInlineSource,
  addSource,
  emitSourcesChanged,
  listInlineSources,
  listSources,
  removeInlineSource,
  removeSource,
  toggleInlineSource,
  toggleSource,
  type CustomSource,
  type InlineSource,
  type SourceKind,
} from "@/lib/sources";
import { downloadJson, generateCatalog } from "@/lib/generator";

const sourceSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(60, "Max 60 chars"),
  url: z.string().trim().url("Must be a valid URL (https://…)").max(500, "URL too long"),
  kind: z.enum(["films", "series"]),
});

type SourceInput = { name: string; url: string; kind: SourceKind };

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { toast } = useToast();
  const [sources, setSources] = useState<CustomSource[]>([]);
  const [inline, setInline] = useState<InlineSource[]>([]);

  // ---- URL form state ----
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<SourceKind>("films");

  // ---- Upload form state ----
  const [uploadKind, setUploadKind] = useState<SourceKind>("films");
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- Generator state ----
  const [genKind, setGenKind] = useState<SourceKind>("films");
  const [genName, setGenName] = useState("");
  const [genUrls, setGenUrls] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genPreview, setGenPreview] = useState<unknown[] | null>(null);

  const refresh = () => {
    setSources(listSources());
    setInline(listInlineSources());
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  // ---- URL handlers ----
  const handleAdd = () => {
    const parsed = sourceSchema.safeParse({ name, url, kind });
    if (!parsed.success) {
      toast({
        title: "Invalid source",
        description: parsed.error.issues[0]?.message ?? "Check your input.",
        variant: "destructive",
      });
      return;
    }
    addSource(parsed.data as SourceInput);
    emitSourcesChanged();
    setName("");
    setUrl("");
    refresh();
    toast({ title: "Source added", description: "Catalog will refresh." });
  };

  const handleRemove = (id: string) => {
    removeSource(id);
    emitSourcesChanged();
    refresh();
  };

  const handleToggle = (id: string) => {
    toggleSource(id);
    emitSourcesChanged();
    refresh();
  };

  // ---- Upload handlers ----
  const handleFileSelected = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("File must contain a JSON array");
      }
      addInlineSource({
        name: uploadName.trim() || file.name,
        kind: uploadKind,
        data: parsed,
      });
      emitSourcesChanged();
      setUploadName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
      toast({
        title: "File imported",
        description: `${parsed.length} ${uploadKind} added to your library.`,
      });
    } catch (err) {
      toast({
        title: "Import failed",
        description:
          err instanceof Error ? err.message : "Could not parse JSON file.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveInline = (id: string) => {
    removeInlineSource(id);
    emitSourcesChanged();
    refresh();
  };

  const handleToggleInline = (id: string) => {
    toggleInlineSource(id);
    emitSourcesChanged();
    refresh();
  };

  const handleExportInline = (s: InlineSource) => {
    try {
      const data = JSON.parse(s.data);
      downloadJson(`${s.kind}-${s.name.replace(/[^a-z0-9]+/gi, "_")}.json`, data);
    } catch {
      toast({
        title: "Export failed",
        description: "Stored data is corrupt.",
        variant: "destructive",
      });
    }
  };

  // ---- Generator handlers ----
  const parsedGenUrls = () =>
    genUrls
      .split(/[\n,\s]+/)
      .map((u) => u.trim())
      .filter(Boolean);

  const handleGenerate = async () => {
    const urls = parsedGenUrls();
    if (!urls.length) {
      toast({
        title: "No URLs",
        description: "Paste at least one JSON URL to generate from.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setGenPreview(null);
    try {
      const result = await generateCatalog(urls);
      setGenPreview(result.data);
      toast({
        title: "Generated",
        description: `${result.data.length} unique items from ${result.fetched}/${urls.length} sources.${
          result.errors.length ? ` ${result.errors.length} failed.` : ""
        }`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadGenerated = () => {
    if (!genPreview) return;
    downloadJson(`${genKind}.json`, genPreview);
  };

  const handleUseGenerated = () => {
    if (!genPreview) return;
    addInlineSource({
      name: genName.trim() || `Generated ${genKind}.json`,
      kind: genKind,
      data: genPreview,
    });
    emitSourcesChanged();
    refresh();
    toast({
      title: "Added to library",
      description: `${genPreview.length} ${genKind} merged into your catalog.`,
    });
    setGenPreview(null);
    setGenUrls("");
    setGenName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage how your library is built — remote URLs, uploaded JSON files, or generated catalogs.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="urls" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="urls">
              <LinkIcon className="mr-2 h-3.5 w-3.5" /> URL Sources
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-3.5 w-3.5" /> Upload JSON
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Wand2 className="mr-2 h-3.5 w-3.5" /> Generate
            </TabsTrigger>
          </TabsList>

          {/* ============ URL SOURCES ============ */}
          <TabsContent value="urls" className="mt-4 space-y-6">
            <section className="space-y-3 rounded-md border border-border/60 bg-card/40 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Add a new source
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="src-name">Name</Label>
                  <Input
                    id="src-name"
                    placeholder="My Server"
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="src-kind">Type</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as SourceKind)}>
                    <SelectTrigger id="src-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="films">Films (films.json)</SelectItem>
                      <SelectItem value="series">Series (series.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="src-url">URL</Label>
                <Input
                  id="src-url"
                  placeholder="https://example.com/films.json"
                  value={url}
                  maxLength={500}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add source
              </Button>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your URL sources ({sources.length})
              </h3>
              {sources.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No URL sources yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sources.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 p-3"
                    >
                      <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {s.name}
                          </span>
                          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {s.kind}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{s.url}</p>
                      </div>
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={() => handleToggle(s.id)}
                        aria-label="Toggle source"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(s.id)}
                        aria-label="Remove source"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>

          {/* ============ UPLOAD ============ */}
          <TabsContent value="upload" className="mt-4 space-y-6">
            <section className="space-y-3 rounded-md border border-border/60 bg-card/40 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Upload a films.json or series.json
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="up-name">Display name (optional)</Label>
                  <Input
                    id="up-name"
                    placeholder="My Backup"
                    value={uploadName}
                    maxLength={60}
                    onChange={(e) => setUploadName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="up-kind">Type</Label>
                  <Select value={uploadKind} onValueChange={(v) => setUploadKind(v as SourceKind)}>
                    <SelectTrigger id="up-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="films">Films</SelectItem>
                      <SelectItem value="series">Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full md:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" /> Choose JSON file…
              </Button>
              <p className="text-xs text-muted-foreground">
                File must be a JSON array matching the films.json / series.json schema.
                Stored locally in your browser.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Imported & generated catalogs ({inline.length})
              </h3>
              {inline.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Nothing imported yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {inline.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 p-3"
                    >
                      <FileJson className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {s.name}
                          </span>
                          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {s.kind}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.count} item{s.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExportInline(s)}
                        aria-label="Export JSON"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={() => handleToggleInline(s.id)}
                        aria-label="Toggle catalog"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveInline(s.id)}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>

          {/* ============ GENERATE ============ */}
          <TabsContent value="generate" className="mt-4 space-y-6">
            <section className="space-y-3 rounded-md border border-border/60 bg-card/40 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Build a films.json / series.json from URLs
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gen-name">Display name (optional)</Label>
                  <Input
                    id="gen-name"
                    placeholder="Combined library"
                    value={genName}
                    maxLength={60}
                    onChange={(e) => setGenName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gen-kind">Type</Label>
                  <Select value={genKind} onValueChange={(v) => setGenKind(v as SourceKind)}>
                    <SelectTrigger id="gen-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="films">Films</SelectItem>
                      <SelectItem value="series">Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gen-urls">Source URLs (one per line)</Label>
                <Textarea
                  id="gen-urls"
                  placeholder={"https://example.com/films.json\nhttps://other.com/films.json"}
                  value={genUrls}
                  onChange={(e) => setGenUrls(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadGenerated}
                  disabled={!genPreview}
                >
                  <Download className="mr-2 h-4 w-4" /> Export .json
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleUseGenerated}
                  disabled={!genPreview}
                >
                  <Plus className="mr-2 h-4 w-4" /> Use in library
                </Button>
                {genPreview && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setGenPreview(null)}
                    aria-label="Clear preview"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {genPreview && (
                <div className="rounded-md border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                  Preview: <span className="text-foreground">{genPreview.length}</span> unique{" "}
                  {genKind} ready. Export to download as <code>{genKind}.json</code> or use
                  to merge into your library.
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
