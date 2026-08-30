#!/usr/bin/env python3
"""Build the Bugcrowd logo wall — same monochrome pipeline as build_logos.py.
Source: the researcher's PUBLIC Bugcrowd hall-of-fame (profile-service hallOfFame API).
Private entries (Bugcrowd's own `private:true` flag) are deliberately excluded.
"""
import re, urllib.request

# public hall-of-fame companies, ordered for impact. (display name, simple-icons slug or None)
# the two Monash programs (Bug Bounty + VDP) are deduped into one mark.
COMPANIES = [
    ("SpaceX",                "spacex"),
    ("Atlassian",             "atlassian"),
    ("Twilio",                "twilio"),
    ("Bitdefender",           "bitdefender"),
    ("Coca-Cola",             "cocacola"),
    ("United Airlines",       "unitedairlines"),
    ("Lenovo",                "lenovo"),
    ("Ibotta",                "ibotta"),
    ("Monash University",     None),
    ("U.S. Veterans Affairs", None),
]

CDN = "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{}.svg"

def esc(s): return s.replace("&", "&amp;")

def fetch_paths(slug):
    try:
        req = urllib.request.Request(CDN.format(slug), headers={"User-Agent": "build/1.0"})
        svg = urllib.request.urlopen(req, timeout=20).read().decode("utf-8")
    except Exception:
        return None
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', svg)
    return "".join(f'<path d="{d}"/>' for d in ds) if ds else None

hits, misses, tiles = [], [], []
for name, slug in COMPANIES:
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

open("_bc_logos.partial.html", "w").write("\n".join(tiles) + "\n")
print(f"TILES: {len(tiles)}")
print(f"ICON ({len(hits)}): " + ", ".join(hits))
print(f"WORD ({len(misses)}): " + ", ".join(misses))
