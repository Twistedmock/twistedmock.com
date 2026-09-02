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
assets/js/main.js       depth-driven scroll, depth gauge, reveals, count-up figures
assets/fonts/           woff2, self-hosted
cv.pdf                  one-page CV, generated from the same figures
serve.py                static file server (runs as portfolio.service on :7777, behind a reverse proxy)
```

## The concept — *a bug in every wave*

The page is a **descent through clear water**. Scroll position maps to depth in metres,
interpolated between each section's `data-depth`, and drives the gauge and the water itself — a
canvas of sun caustics, drifting glints and sparkle over a light, glassy surface, with every panel
a pane of frosted glass. Moving the pointer disturbs the water; clicking sends out a ripple.

That structure carries the argument. Most of my reputation lives in private, invitation-only
programs — so the deepest section, the one you have to travel furthest to reach, is the single
dark panel on an otherwise sunlit page: the part of the work nobody sees from the surface.

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
