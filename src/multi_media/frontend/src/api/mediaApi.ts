/**
 * mediaApi.ts
 * Helpers for browsing the Dhaka-Flix media servers through the Django backend.
 */

import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface MediaItem {
  title: string;
  href: string;       // full URL on the media server
  isFolder: boolean;
  ext: string;        // file extension, e.g. ".mp4"
  date: string;
}

// ── In-memory caches ──────────────────────────────────────────────────────────
const dirCache = new Map<string, MediaItem[]>();
const thumbCache = new Map<string, string[]>();

// ── Core helpers ──────────────────────────────────────────────────────────────

/** Fetch a directory listing from the backend browse endpoint. */
export async function fetchDirectory(path: string): Promise<MediaItem[]> {
  if (dirCache.has(path)) return dirCache.get(path)!;

  const res = await axios.get<{ items: MediaItem[] }>(`${BASE}/browse/`, {
    params: { path },
    timeout: 15_000,
  });

  const items = res.data.items ?? [];
  dirCache.set(path, items);
  return items;
}

/** Build a proxy URL so the browser fetches media through the Django backend. */
export function proxyUrl(href: string): string {
  return `${BASE}/proxy/?url=${encodeURIComponent(href)}`;
}

/** Is this a video file? */
export function isVideo(item: MediaItem): boolean {
  return ['.mp4', '.mkv', '.avi', '.webm', '.m4v', '.mov'].includes(item.ext.toLowerCase());
}

/** Is this an image file? */
export function isImage(item: MediaItem): boolean {
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(item.ext.toLowerCase());
}

// ── Thumbnail discovery ───────────────────────────────────────────────────────

/**
 * Given a folder MediaItem, resolve up to `limit` image URLs found inside it
 * (or up to 2 levels deep). Returns proxied URLs.
 */
export async function resolveThumbnails(
  item: MediaItem,
  limit = 8,
): Promise<string[]> {
  const cacheKey = item.href;
  if (thumbCache.has(cacheKey)) return thumbCache.get(cacheKey)!;

  if (!item.isFolder) {
    const result = isImage(item) ? [proxyUrl(item.href)] : [];
    thumbCache.set(cacheKey, result);
    return result;
  }

  try {
    // Derive path from href: strip the server base
    const url = new URL(item.href);
    const path = url.pathname;

    const children = await fetchDirectory(path);
    let imgs = children.filter(isImage).map(f => proxyUrl(f.href));

    // If no direct images, peek into first 2 sub-folders
    if (imgs.length === 0) {
      const subs = children.filter(c => c.isFolder).slice(0, 2);
      const subResults = await Promise.all(
        subs.map(async sub => {
          try {
            const subPath = new URL(sub.href).pathname;
            const subChildren = await fetchDirectory(subPath);
            return subChildren.filter(isImage).map(f => proxyUrl(f.href));
          } catch {
            return [] as string[];
          }
        }),
      );
      imgs = subResults.flat();
    }

    const final = imgs.slice(0, limit);
    thumbCache.set(cacheKey, final);
    return final;
  } catch {
    thumbCache.set(cacheKey, []);
    return [];
  }
}

// ── Library definitions (matching the actual Dhaka-Flix server structure) ────

export interface Library {
  label: string;
  path: string;       // server path, e.g. "/DHAKA-FLIX-7/English Movies/"
  accentColor: string;
}

export const LIBRARIES: Library[] = [
  { label: 'English Movies', path: '/DHAKA-FLIX-7/English%20Movies/', accentColor: '#6366f1' },
  { label: 'TV & Web Series', path: '/DHAKA-FLIX-12/TV-WEB-Series/', accentColor: '#3b82f6' },
  { label: 'Hindi Movies', path: '/DHAKA-FLIX-14/Hindi%20Movies/', accentColor: '#f59e0b' },
  { label: 'South Indian (Hindi)', path: '/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/', accentColor: '#10b981' },
  { label: 'South Indian Movies', path: '/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/', accentColor: '#06b6d4' },
  { label: 'Animation (1080p)', path: '/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/', accentColor: '#a855f7' },
  { label: 'Animation Movies', path: '/DHAKA-FLIX-14/Animation%20Movies/', accentColor: '#ec4899' },
  { label: 'IMDb Top-250', path: '/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/', accentColor: '#eab308' },
  { label: 'Korean TV & Series', path: '/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/', accentColor: '#ef4444' },
  { label: 'English (1080p)', path: '/DHAKA-FLIX-14/English%20Movies%20%281080p%29/', accentColor: '#f97316' },
  { label: 'Kolkata Bangla', path: '/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/', accentColor: '#84cc16' },
  { label: 'Satyajit Ray Films', path: '/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/Satyajit%20Ray%20Films/', accentColor: '#14b8a6' },
  { label: 'Foreign Language', path: '/DHAKA-FLIX-7/Foreign%20Language%20Movies/', accentColor: '#64748b' },
  { label: '3D Movies', path: '/DHAKA-FLIX-7/3D%20Movies/', accentColor: '#8b5cf6' },
  { label: 'Cartoon / Anime', path: '/DHAKA-FLIX-9/Anime%20%26%20Cartoon%20TV%20Series/', accentColor: '#f43f5e' },
  { label: 'Documentary', path: '/DHAKA-FLIX-9/Documentary/', accentColor: '#0ea5e9' },
  { label: 'PC Games', path: '/DHAKA-FLIX-8/PC%20Games/', accentColor: '#22c55e' },
  { label: 'Android Games', path: '/DHAKA-FLIX-8/Android%20Games/', accentColor: '#a3e635' },
  { label: 'Software', path: '/DHAKA-FLIX-8/Software/', accentColor: '#94a3b8' },
  { label: 'Tutorial & Training', path: '/DHAKA-FLIX-9/Tutorial/', accentColor: '#fb923c' },
];
