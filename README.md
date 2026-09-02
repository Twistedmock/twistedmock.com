# twistedmock.com

My portfolio. I'm **Mahmud Hasan Sizan** — an offensive-security researcher and bug-bounty
hunter (HackerOne & Bugcrowd handle: **twistedmock**).

Live: **https://twistedmock.com**

A single static page — no build step, and no third-party requests at runtime (fonts and icons
are self-hosted or inlined). Edit and refresh.

## Layout

```
index.html              all copy and figures
assets/css/style.css    the design system
assets/css/fonts.css    self-hosted @font-face
assets/js/surface.js    the water — sun caustics, drifting glints, sparkle, and pointer ripples
assets/js/main.js       scroll → water depth, reveals, count-up figures
assets/fonts/           woff2, self-hosted
cv.pdf                  one-page CV, generated from the same figures
.well-known/security.txt  RFC 9116 security contact (mirrored at /security.txt)
serve.py                static file server used for staging on the VPS; production is GitHub Pages
```

## The concept — *a bug in every wave*

Proof first. The page is built the way the strongest bug-bounty portfolios are built — a plain
statement of what I do and for whom, the platform profiles up top where they can be checked, then a
dated list of the results that are on the record, each linked to its source. Light, calm and glassy:
every panel is a pane of frosted glass over a slow mesh of light, with a canvas of sun caustics,
glints and sparkle behind it. Moving the pointer disturbs the water; clicking sends out a ripple.

Most of my reputation lives in private, invitation-only programs whose names are withheld as their
terms require — so the page leans on what can be checked: the platform profiles, the dated
highlights, and the vendors' own acknowledgement pages.

## Where the figures come from

Every number on the page is pulled live from the platforms, not transcribed from a CV:

- **HackerOne GraphQL** (`POST /graphql`). The public schema is locked down, but `__type`
  introspection still exposes the `User` type, and `thanks_items` returns per-program rank,
  reputation, and report counts — enough to reconstruct the whole record.
- **Bugcrowd** `profile-service` API, read from my own authenticated session.
- Vendor acknowledgement pages for the public credits.

Only public programs are ever named. Private programs on both platforms are withheld, as their
disclosure terms require — that restraint is deliberate, and the page says so.

## Running it

```bash
systemctl restart portfolio      # only needed after editing serve.py
journalctl -u portfolio -f       # logs
```
