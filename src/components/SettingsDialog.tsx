import { useEffect, useState } from "react";
import { z } from "zod";
import { Trash2, Plus, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  addSource,
  emitSourcesChanged,
  listSources,
  removeSource,
  toggleSource,
  type CustomSource,
  type SourceKind,
} from "@/lib/sources";

const sourceSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(60, "Max 60 chars"),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL (https://…)")
    .max(500, "URL too long"),
  kind: z.enum(["films", "series"]),
}) satisfies z.ZodType<{ name: string; url: string; kind: SourceKind }>;

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { toast } = useToast();
  const [sources, setSources] = useState<CustomSource[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<SourceKind>("films");

  const refresh = () => setSources(listSources());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

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
    addSource(parsed.data);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Add your own JSON catalog URLs. They'll be merged with the default library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
              Your sources ({sources.length})
            </h3>
            {sources.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No custom sources yet. Add one above to extend your catalog.
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
