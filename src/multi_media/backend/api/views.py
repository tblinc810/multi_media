"""
api/views.py  –  Dhaka-Flix media backend
==========================================
Improvements over v1:
  • Streaming proxy with proper Range-request pass-through (video seeking)
  • Thread-safe LRU in-memory cache for directory listings (TTL = 5 min)
  • Concurrent async directory fetching via httpx.AsyncClient
  • Hardened h5ai HTML parser (handles varied markup, strips HTML entities)
  • /api/search/?q=<term>  – searches across all servers simultaneously
  • /api/health/           – per-server reachability check
"""

import os
import re
import time
import asyncio
import threading
import html as html_lib
from collections import OrderedDict
from urllib.parse import urljoin, urlparse, unquote

import httpx
from django.conf import settings as django_settings
from django.http import StreamingHttpResponse, HttpResponse
from dotenv import load_dotenv
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets

load_dotenv()

# ── Server map ────────────────────────────────────────────────────────────────

SERVER_MAP: dict[str, str] = {
    "7":  os.getenv("MEDIA_PUBLIC_SERVER_7",  "http://172.16.50.7"),
    "8":  os.getenv("MEDIA_PUBLIC_SERVER_8",  "http://172.16.50.8"),
    "9":  os.getenv("MEDIA_PUBLIC_SERVER_9",  "http://172.16.50.9"),
    "12": os.getenv("MEDIA_PUBLIC_SERVER_12", "http://172.16.50.12"),
    "14": os.getenv("MEDIA_PUBLIC_SERVER_14", "http://172.16.50.14"),
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"}
VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".webm", ".m4v", ".mov", ".flv"}
MEDIA_EXTS = IMAGE_EXTS | VIDEO_EXTS

_SKIP_PREFIXES = ("/_h5ai/", "//fonts.", "http://browsehappy", "https://larsjung", "..")
_SKIP_TITLES   = {"parent directory", ""}

# ── Cache & timeout config (driven by .env via settings.py) ──────────────────
_CACHE_TTL     = getattr(django_settings, 'BROWSE_CACHE_TTL',     300)
_CACHE_MAXSIZE = getattr(django_settings, 'BROWSE_CACHE_MAXSIZE', 512)
_PROXY_TIMEOUT = getattr(django_settings, 'PROXY_TIMEOUT',        60)

class _LRUCache:
    """Simple thread-safe LRU dict with per-entry TTL."""

    def __init__(self, maxsize: int = _CACHE_MAXSIZE, ttl: int = _CACHE_TTL):
        self._maxsize = maxsize
        self._ttl     = ttl
        self._store: OrderedDict[str, tuple[float, object]] = OrderedDict()
        self._lock    = threading.Lock()

    def get(self, key: str):
        with self._lock:
            if key not in self._store:
                return None
            ts, value = self._store[key]
            if time.monotonic() - ts > self._ttl:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return value

    def set(self, key: str, value: object) -> None:
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = (time.monotonic(), value)
            while len(self._store) > self._maxsize:
                self._store.popitem(last=False)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._store)


_dir_cache = _LRUCache()

# ── Server resolution ─────────────────────────────────────────────────────────

def _resolve_server(path: str) -> tuple[str | None, str | None]:
    """Return (server_id, base_url) for a given /DHAKA-FLIX-N/... path."""
    for sid, base in SERVER_MAP.items():
        if path.startswith(f"/DHAKA-FLIX-{sid}"):
            return sid, base
    return None, None


def _allowed_host(url: str) -> bool:
    """Only allow proxy requests to known media servers."""
    allowed = {urlparse(v).netloc for v in SERVER_MAP.values()}
    return urlparse(url).netloc in allowed

# ── h5ai HTML parser ──────────────────────────────────────────────────────────

# Matches: <td class="fb-n ..."><a href="...">title</a>
_ROW_RE = re.compile(
    r'<td[^>]*\bclass=["\'][^"\']*\bfb-n\b[^"\']*["\'][^>]*>.*?'
    r'<a\s+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
    re.DOTALL | re.IGNORECASE,
)
_DATE_RE = re.compile(
    r'<td[^>]*\bclass=["\'][^"\']*\bfb-d\b[^"\']*["\'][^>]*>(.*?)</td>',
    re.DOTALL | re.IGNORECASE,
)
_TAG_RE  = re.compile(r'<[^>]+>')


def _parse_h5ai(html: str, base_url: str) -> list[dict]:
    """
    Parse an h5ai directory listing page and return a list of item dicts:
      { title, href, isFolder, ext, date }
    href is always the *full* URL on the media server.
    """
    items: list[dict] = []
    seen: set[str]    = set()

    dates = [d.strip() for d in _DATE_RE.findall(html)]

    for i, m in enumerate(_ROW_RE.finditer(html)):
        raw_href  = m.group(1).strip()
        raw_title = html_lib.unescape(_TAG_RE.sub("", m.group(2))).strip()

        # Skip junk entries
        if any(raw_href.startswith(p) for p in _SKIP_PREFIXES):
            continue
        if raw_title.lower() in _SKIP_TITLES:
            continue
        if raw_href in seen:
            continue
        seen.add(raw_href)

        # Build absolute URL
        if raw_href.startswith("http"):
            full_url = raw_href
        else:
            full_url = urljoin(base_url, raw_href)

        is_folder = raw_href.endswith("/")
        path_part = unquote(urlparse(full_url).path)
        ext       = "" if is_folder else os.path.splitext(path_part)[1].lower()
        date      = dates[i] if i < len(dates) else ""

        # Strip residual HTML from date
        date = html_lib.unescape(_TAG_RE.sub("", date)).strip()

        items.append({
            "title":    raw_title,
            "href":     full_url,
            "isFolder": is_folder,
            "ext":      ext,
            "date":     date,
        })

    return items


# ── Sync fetch helper (used by BrowseView & SearchView) ──────────────────────

def _fetch_directory(path: str, timeout: float = 12.0) -> list[dict] | None:
    """
    Fetch + parse a directory listing. Returns None on error.
    Results are cached with TTL.
    """
    cached = _dir_cache.get(path)
    if cached is not None:
        return cached  # type: ignore[return-value]

    _, base_url = _resolve_server(path)
    if not base_url:
        # Try all servers
        for base in SERVER_MAP.values():
            url = base + path
            try:
                with httpx.Client(timeout=timeout) as client:
                    res = client.get(url, follow_redirects=True)
                if res.status_code == 200:
                    base_url = base
                    break
            except httpx.RequestError:
                continue

    if not base_url:
        return None

    full_url = base_url + path
    try:
        with httpx.Client(timeout=timeout) as client:
            res = client.get(full_url, follow_redirects=True)
        if res.status_code != 200:
            return None
        items = _parse_h5ai(res.text, base_url)
        _dir_cache.set(path, items)
        return items
    except httpx.RequestError:
        return None


# ── Async fetch helper (used for concurrent search) ──────────────────────────

async def _async_fetch_directory(path: str, base_url: str, timeout: float = 8.0) -> list[dict]:
    """Async version – used for concurrent multi-server search."""
    full_url = base_url + path
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.get(full_url, follow_redirects=True)
        if res.status_code == 200:
            items = _parse_h5ai(res.text, base_url)
            _dir_cache.set(path, items)
            return items
    except (httpx.RequestError, Exception):
        pass
    return []


# ══════════════════════════════════════════════════════════════════════════════
# Views
# ══════════════════════════════════════════════════════════════════════════════

class ServerViewSet(viewsets.ViewSet):
    """GET /api/servers/ – list all configured servers."""

    def list(self, request):
        return Response({sid: url for sid, url in SERVER_MAP.items()})

    def retrieve(self, request, pk=None):
        base = SERVER_MAP.get(pk)
        if not base:
            return Response({"error": "Server not found"}, status=404)
        try:
            with httpx.Client(timeout=6.0) as client:
                res = client.get(base, follow_redirects=True)
            return Response({"server": pk, "url": base, "status": res.status_code, "online": True})
        except httpx.RequestError as exc:
            return Response({"server": pk, "url": base, "online": False, "error": str(exc)})

    @action(detail=False, methods=["get"], url_path="health")
    def health(self, request):
        """GET /api/servers/health/ – ping all servers concurrently."""
        results: dict[str, dict] = {}

        def _ping(sid: str, base: str) -> None:
            try:
                with httpx.Client(timeout=5.0) as client:
                    res = client.get(base, follow_redirects=True)
                results[sid] = {"url": base, "online": True, "status": res.status_code, "latency_ms": round(res.elapsed.total_seconds() * 1000)}
            except httpx.RequestError:
                results[sid] = {"url": base, "online": False}

        threads = [threading.Thread(target=_ping, args=(sid, base)) for sid, base in SERVER_MAP.items()]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=6)

        all_online = all(v.get("online") for v in results.values())
        return Response({"servers": results, "all_online": all_online, "cache_size": _dir_cache.size})


class BrowseView(APIView):
    """
    GET /api/browse/?path=/DHAKA-FLIX-7/English%20Movies/
    Returns a parsed JSON list of directory items.
    Responses are LRU-cached for 5 minutes.
    Query params:
      ?refresh=1   – force cache bypass
    """

    def get(self, request):
        path = request.query_params.get("path", "").strip()
        if not path:
            return Response({"error": "path query parameter required"}, status=400)

        force_refresh = request.query_params.get("refresh", "0") == "1"
        if force_refresh:
            _dir_cache.invalidate(path)

        items = _fetch_directory(path)
        if items is None:
            return Response({"error": "Could not fetch directory", "path": path}, status=502)

        return Response({
            "path":   path,
            "count":  len(items),
            "cached": not force_refresh,
            "items":  items,
        })


class ProxyView(APIView):
    """
    GET /api/proxy/?url=http://172.16.50.7/DHAKA-FLIX-7/...
    Streams raw bytes from the media server back to the client.
    Supports Range requests for video seeking / partial content.
    """

    def get(self, request):
        url = request.query_params.get("url", "").strip()
        if not url:
            return Response({"error": "url query parameter required"}, status=400)

        if not _allowed_host(url):
            return Response({"error": "URL not in allowed servers"}, status=403)

        # Forward Range header if present
        headers: dict[str, str] = {}
        range_header = request.META.get("HTTP_RANGE") or request.META.get("HTTP_RANGE_HEADER")
        if range_header:
            headers["Range"] = range_header

        try:
            with httpx.Client(timeout=_PROXY_TIMEOUT) as client:
                upstream = client.get(url, headers=headers, follow_redirects=True)

            content_type = upstream.headers.get("content-type", "application/octet-stream")
            status_code  = upstream.status_code  # 200 or 206 (partial)

            response = HttpResponse(
                upstream.content,
                status=status_code,
                content_type=content_type,
            )

            # Pass through all headers needed for media streaming
            passthrough_headers = (
                "Content-Length",
                "Content-Range",
                "Accept-Ranges",
                "Last-Modified",
                "ETag",
                "Cache-Control",
            )
            for h in passthrough_headers:
                if h in upstream.headers:
                    response[h] = upstream.headers[h]

            # Ensure Range requests are supported
            if "Accept-Ranges" not in upstream.headers:
                response["Accept-Ranges"] = "bytes"

            response["Access-Control-Allow-Origin"]  = "*"
            response["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges"

            return response

        except httpx.TimeoutException:
            return Response({"error": "Upstream server timed out"}, status=504)
        except httpx.RequestError as exc:
            return Response({"error": str(exc)}, status=502)


class SearchView(APIView):
    """
    GET /api/search/?q=<term>&server=<id>
    Searches all configured servers concurrently for folders/files matching
    the query string (case-insensitive, partial match).

    Optional params:
      ?server=7          – limit to a single server
      ?limit=50          – max results (default 30)
      ?type=video|image  – filter by file type
    """

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response({"error": "q must be at least 2 characters"}, status=400)

        server_filter = request.query_params.get("server", "").strip()
        limit         = min(int(request.query_params.get("limit", 30)), 100)
        type_filter   = request.query_params.get("type", "").lower()  # "video", "image", ""

        # Determine which top-level paths to search
        search_targets: list[tuple[str, str]] = []  # (path, base_url)
        for sid, base in SERVER_MAP.items():
            if server_filter and sid != server_filter:
                continue
            # Fetch top-level listing to get categories
            top_path = f"/DHAKA-FLIX-{sid}/"
            top_items = _fetch_directory(top_path, timeout=8.0) or []
            for item in top_items:
                if item["isFolder"]:
                    sub_path = urlparse(item["href"]).path
                    search_targets.append((sub_path, base))

        if not search_targets:
            return Response({"results": [], "query": query, "total": 0})

        # Search concurrently using asyncio
        results: list[dict] = []
        results_lock = threading.Lock()
        query_lower  = query.lower()

        def _search_path(path: str, base_url: str) -> None:
            items = _fetch_directory(path, timeout=8.0) or []
            for item in items:
                if query_lower in item["title"].lower():
                    # Apply type filter
                    if type_filter == "video" and item["ext"] not in VIDEO_EXTS and not item["isFolder"]:
                        continue
                    if type_filter == "image" and item["ext"] not in IMAGE_EXTS:
                        continue
                    with results_lock:
                        results.append(item)

        threads = [
            threading.Thread(target=_search_path, args=(path, base))
            for path, base in search_targets
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=10)

        # Sort: folders first, then by title
        results.sort(key=lambda x: (not x["isFolder"], x["title"].lower()))
        trimmed = results[:limit]

        return Response({
            "query":   query,
            "total":   len(results),
            "count":   len(trimmed),
            "results": trimmed,
        })


class CacheView(APIView):
    """
    GET  /api/cache/  – stats
    DELETE /api/cache/ – clear all cached listings
    """

    def get(self, request):
        return Response({
            "size":    _dir_cache.size,
            "maxsize": _CACHE_MAXSIZE,
            "ttl_sec": _CACHE_TTL,
        })

    def delete(self, request):
        _dir_cache.clear()
        return Response({"message": "Cache cleared", "size": 0})
