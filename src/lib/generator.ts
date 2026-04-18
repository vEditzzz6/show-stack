// Build a films.json / series.json payload by fetching one or more URLs
// and merging them. Each URL must return an array matching the expected schema.
// Used by SettingsDialog → "Generator" tab.

export type GeneratorKind = "films" | "series";

export interface GeneratorResult<T> {
  data: T[];
  errors: { url: string; message: string }[];
  fetched: number;
}

async function fetchArray<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("Response is not a JSON array");
  return json as T[];
}

export async function generateCatalog<T extends { title?: string }>(
  urls: string[]
): Promise<GeneratorResult<T>> {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  const errors: { url: string; message: string }[] = [];
  const merged: T[] = [];
  const seen = new Set<string>();
  let fetched = 0;

  await Promise.all(
    cleaned.map(async (url) => {
      try {
        const list = await fetchArray<T>(url);
        fetched++;
        for (const item of list) {
          const key = (item.title || "").toString().toLowerCase().trim();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(item);
        }
      } catch (err) {
        errors.push({
          url,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  return { data: merged, errors, fetched };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
