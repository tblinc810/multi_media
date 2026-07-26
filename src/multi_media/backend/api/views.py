import os
import re
import httpx
from urllib.parse import urljoin, urlparse, unquote
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse, HttpResponse
from dotenv import load_dotenv

load_dotenv()

# ── Helpers ──────────────────────────────────────────────────────────────────

SERVER_MAP = {
    "7":  os.getenv("MEDIA_PUBLIC_SERVER_7",  "http://172.16.50.7"),
    "8":  os.getenv("MEDIA_PUBLIC_SERVER_8",  "http://172.16.50.8"),
    "9":  os.getenv("MEDIA_PUBLIC_SERVER_9",  "http://172.16.50.9"),
    "12": os.getenv("MEDIA_PUBLIC_SERVER_12", "http://172.16.50.12"),
    "14": os.getenv("MEDIA_PUBLIC_SERVER_14", "http://172.16.50.14"),
}

# h5ai-specific junk links to ignore when parsing directory listings
_SKIP_PREFIXES = ("/_h5ai/", "//fonts.", "http://browsehappy", "https://larsjung", "..")
_SKIP_ATTRS    = ("folder-parent",)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"}
VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".webm", ".m4v", ".mov", ".flv"}
MEDIA_EXTS = IMAGE_EXTS | VIDEO_EXTS


def _resolve_server(path: str):
    """
    Given a path like '/DHAKA-FLIX-7/English Movies/...' figure out which
    media server hosts it and return (server_id, server_base_url, path).
    """
    for sid, base in SERVER_MAP.items():
        prefix = f"/DHAKA-FLIX-{sid}"
        if path.startswith(prefix):
            return sid, base, path
    return None, None, path


def _parse_h5ai_html(html: str, base_url: str) -> list[dict]:
    """
    Parse an h5ai directory listing HTML and return a list of items.
    Each item: { title, href, isFolder, ext, date }
    href is always the full URL on the media server.
    """
    # h5ai renders links inside <td class="fb-n">
    items = []
    seen = set()

    # Grab all anchor tags from the fallback table
    pattern = re.compile(
        r'<td[^>]*class="fb-n"[^>]*>.*?<a\s+href="([^"]+)"[^>]*>(.*?)</a>',
        re.DOTALL | re.IGNORECASE,
    )
    date_pattern = re.compile(r'<td[^>]*class="fb-d"[^>]*>(.*?)</td>', re.DOTALL)
    dates = date_pattern.findall(html)

    for i, m in enumerate(pattern.finditer(html)):
        raw_href = m.group(1).strip()
        raw_title = re.sub(r"<[^>]+>", "", m.group(2)).strip()

        # Skip junk
        if any(raw_href.startswith(p) for p in _SKIP_PREFIXES):
            continue
        if raw_title in ("Parent Directory", "") or not raw_title:
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
        ext = "" if is_folder else os.path.splitext(path_part)[1].lower()
        date = dates[i].strip() if i < len(dates) else ""

        items.append({
            "title":    unquote(raw_title),
            "href":     full_url,
            "isFolder": is_folder,
            "ext":      ext,
            "date":     date,
        })

    return items


# ── ViewSets ─────────────────────────────────────────────────────────────────

class ServerViewSet(viewsets.ViewSet):
    """List all known media servers."""

    def list(self, request):
        return Response({sid: url for sid, url in SERVER_MAP.items()})

    def retrieve(self, request, pk=None):
        server_url = SERVER_MAP.get(pk)
        if not server_url:
            return Response({"error": "Server not found"}, status=404)
        try:
            with httpx.Client(timeout=8.0) as client:
                res = client.get(server_url)
                return Response({"status": res.status_code})
        except httpx.RequestError as exc:
            return Response({"error": str(exc)}, status=500)


class BrowseView(APIView):
    """
    GET /api/browse/?path=/DHAKA-FLIX-7/English%20Movies/
    Fetches the h5ai directory at the given path from the correct media
    server and returns a parsed JSON list of items.
    """

    def get(self, request):
        path = request.query_params.get("path", "")
        if not path:
            return Response({"error": "path query parameter required"}, status=400)

        sid, base_url, _ = _resolve_server(path)
        if not base_url:
            # Try all servers
            for s_id, s_base in SERVER_MAP.items():
                full_url = s_base + path
                try:
                    with httpx.Client(timeout=10.0) as client:
                        res = client.get(full_url, follow_redirects=True)
                    if res.status_code == 200:
                        base_url = s_base
                        break
                except httpx.RequestError:
                    continue

        if not base_url:
            return Response({"error": "Could not find server for this path"}, status=404)

        full_url = base_url + path
        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.get(full_url, follow_redirects=True)
            if res.status_code != 200:
                return Response({"error": f"Media server returned {res.status_code}"}, status=res.status_code)

            items = _parse_h5ai_html(res.text, base_url)
            return Response({"path": path, "items": items})

        except httpx.RequestError as exc:
            return Response({"error": str(exc)}, status=503)


class ProxyView(APIView):
    """
    GET /api/proxy/?url=http://172.16.50.7/DHAKA-FLIX-7/...
    Streams the raw bytes from a media server URL back to the client.
    Handles Range requests so video seeking works.
    """

    def get(self, request):
        url = request.query_params.get("url", "")
        if not url:
            return Response({"error": "url query parameter required"}, status=400)

        # Only allow URLs that point to our known servers
        allowed_hosts = {urlparse(v).netloc for v in SERVER_MAP.values()}
        parsed_host = urlparse(url).netloc
        if parsed_host not in allowed_hosts:
            return Response({"error": "URL not in allowed servers"}, status=403)

        headers = {}
        if "HTTP_RANGE" in request.META:
            headers["Range"] = request.META["HTTP_RANGE"]

        try:
            with httpx.Client(timeout=30.0) as client:
                upstream = client.get(url, headers=headers, follow_redirects=True)

            content_type = upstream.headers.get("content-type", "application/octet-stream")
            status_code  = upstream.status_code

            response = HttpResponse(
                upstream.content,
                status=status_code,
                content_type=content_type,
            )
            # Pass through headers needed for video streaming
            for h in ("Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag"):
                if h in upstream.headers:
                    response[h] = upstream.headers[h]
            response["Access-Control-Allow-Origin"] = "*"
            return response

        except httpx.RequestError as exc:
            return Response({"error": str(exc)}, status=503)
