#!/usr/bin/env python3
"""Build the company logo wall for the ocean portfolio.

Pulls brand marks from simple-icons at BUILD TIME (never at runtime), extracts the
monochrome vector path, and emits the <ol class="logos"> markup. Companies without a
clean icon fall back to a wordmark tile so the wall stays gapless and consistent.
Run: python3 build_logos.py  ->  writes _logos.partial.html and prints a hit/miss report.
"""
import re, sys, urllib.request

# (display name, simple-icons slug or None). Ordered for visual impact, most
# recognisable brands first. These are all PUBLIC HackerOne programs that thanked him.
COMPANIES = [
    ("PayPal",        "paypal"),
    ("Adobe",         "adobe"),
    ("GitHub",        "github"),
    ("Spotify",       "spotify"),
    ("Roblox",        "roblox"),
    ("UPS",           "ups"),
    ("Xiaomi",        "xiaomi"),
    ("Goldman Sachs", "goldmansachs"),
    ("Palantir",      "palantir"),
    ("Crypto.com",    "cryptodotcom"),
    ("Instacart",     "instacart"),
    ("AT&T",          "atandt"),
    ("Databricks",    "databricks"),
    ("Hostinger",     "hostinger"),
    ("Kubernetes",    "kubernetes"),
    ("Nextcloud",     "nextcloud"),
    ("Vimeo",         "vimeo"),
    ("Stellar",       "stellar"),
    ("John Deere",    "johndeere"),
    ("Veeam",         "veeam"),
    ("Hyperledger",   "hyperledger"),
    ("Trellix",       "trellix"),
    ("Glovo",         "glovo"),
    ("Acronis",       "acronis"),
    ("Hilton",        "hiltonhotelsandresorts"),
    ("Hyatt",         "hyatt"),
    ("S-Pankki",      None),
    ("Omise",         None),
    ("Magisto",       None),
    ("U.S. GSA",      None),
]

CDN = "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{}.svg"

def esc(s):
    return s.replace("&", "&amp;")

def fetch_paths(slug):
    """Return concatenated <path .../> markup (fill via currentColor) or None."""
    try:
        req = urllib.request.Request(CDN.format(slug), headers={"User-Agent": "build/1.0"})
        svg = urllib.request.urlopen(req, timeout=20).read().decode("utf-8")
    except Exception as e:
        return None
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', svg)
    if not ds:
        return None
    return "".join(f'<path d="{d}"/>' for d in ds)

seen = set()
hits, misses, tiles = [], [], []
for name, slug in COMPANIES:
    if name in seen:
        continue
    seen.add(name)
    paths = fetch_paths(slug) if slug else None
    if paths:
        hits.append(name)
        tiles.append(
            '    <li class="logo reveal">'
            f'<span class="logo__mk"><svg viewBox="0 0 24 24" role="img" aria-hidden="true">{paths}</svg></span>'
            f'<span class="logo__n">{esc(name)}</span></li>'
        )
    else:
        misses.append(name)
        tiles.append(
            '    <li class="logo logo--word reveal">'
            f'<span class="logo__n">{esc(name)}</span></li>'
        )

with open("_logos.partial.html", "w") as f:
    f.write("\n".join(tiles) + "\n")

print(f"TILES: {len(tiles)}")
print(f"ICON  ({len(hits)}): " + ", ".join(hits))
print(f"WORD  ({len(misses)}): " + ", ".join(misses))
