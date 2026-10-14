import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const INVIDIOUS_INSTANCES = [
  "https://iv.melmac.space",
  "https://invidious.privacyredirect.com",
  "https://invidious.fdn.fr",
  "https://yewtu.be",
  "https://invidious.tiekoetter.com",
  "https://yt.dragonbanelord.com",
];

async function tryInstance(base: string, q: string, page: number, max: number): Promise<any[]> {
  const url = `${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort_by=relevance&page=${page}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: { "User-Agent": "Mozilla/5.0 MyStream/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  if (!text.trimStart().startsWith("[")) throw new Error("Not JSON array");
  const data = JSON.parse(text);
  if (!Array.isArray(data) || data.length === 0) throw new Error("Empty results");
  return data.slice(0, max);
}

async function searchAllInstances(q: string, page: number, max: number): Promise<any[] | null> {
  // Race all instances in parallel — first success wins
  try {
    const result = await Promise.any(
      INVIDIOUS_INSTANCES.map(base =>
        tryInstance(base, q, page, max).catch(err => {
          logger.warn({ base, err: err?.message }, "Invidious instance failed");
          throw err;
        })
      )
    );
    return result;
  } catch {
    return null;
  }
}

router.get("/yt/search", async (req, res) => {
  const q = req.query.q as string;
  const max = Math.min(parseInt(req.query.max as string) || 12, 50);
  const page = parseInt(req.query.page as string) || 1;

  if (!q?.trim()) {
    res.json({ items: [], nextPageToken: null });
    return;
  }

  const data = await searchAllInstances(q.trim(), page, max);

  if (!data) {
    res.json({ items: [], nextPageToken: null });
    return;
  }

  const items = data.map((v: any) => ({
    url: v.videoId,
    nome: v.title,
    thumb: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    tipo: "yt",
    artista: v.author,
    duracao: v.lengthSeconds,
  }));

  const hasMore = items.length >= max;
  res.json({ items, nextPageToken: hasMore ? String(page + 1) : null });
});

export default router;
