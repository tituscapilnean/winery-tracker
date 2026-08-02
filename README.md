# Winery Tracker

Wineries we've visited in Napa and Sonoma, and the ones still on the list.

**Live site:** https://tituscapilnean.github.io/winery-tracker/

Plain static HTML/CSS/JS — no build step, no dependencies to install. GitHub Pages
serves the repo root directly, so any commit to `main` is live in about 30 seconds.

```
index.html            markup
assets/style.css      styles (light + dark)
assets/app.js         loads the JSON, renders stats, map, and list
data/wineries.json    the only file you need to edit
```

## Enabling GitHub Pages (one time)

Settings → Pages → Source: **Deploy from a branch** → branch `main`, folder `/ (root)`.

## Adding a winery

Add an object to `data/wineries.json`. Only `name`, `region`, and `status` are
required, so a to-visit entry can be three lines.

```json
{
  "name": "Ridge Lytton Springs",
  "region": "Dry Creek Valley",
  "area": "Sonoma",
  "status": "visited",
  "date": "2026-09-14",
  "rating": 4.5,
  "notes": "Zin-heavy lineup. Great deck.",
  "website": "https://www.ridgewine.com/",
  "coords": [38.7107, -122.9028]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Winery name, shown as the card heading. |
| `region` | yes | AVA or sub-region, e.g. `Rutherford`. Drives the region filter. |
| `status` | yes | `visited` or `to-visit`. Nothing else. |
| `area` | no | `Napa` or `Sonoma`. Shown as secondary context. |
| `date` | no | `YYYY-MM-DD`. Omit for to-visit entries. |
| `rating` | no | `0`–`5`, half steps allowed. `null` renders as unrated and is left out of the average. |
| `notes` | no | Free text tasting notes. |
| `website` | no | Full URL including `https://`. |
| `coords` | no | `[latitude, longitude]`. Without it the winery shows in the list but not on the map. |

A trailing comma or a missing brace will show an error banner on the page rather
than silently rendering a partial list.

### Star ratings

Every visited winery has a clickable five-star control on its card. Click a star
to rate, click the same star again to clear it. Ratings feed the average-rating
stat and the "Sort by rating" option immediately.

`data/wineries.json` is the source of truth for ratings — it's the only copy
every device sees. The site is static with no backend, so a click can't write to
it directly; it lands in a `localStorage` overlay (`winery-tracker:ratings`)
that shadows the file **in that browser only**. Until it's committed, that
rating does not exist on your phone.

An export bar appears above the map whenever the overlay holds anything, telling
you how many ratings are stranded. To land them:

1. **Copy updated JSON** (or **Download**) — you get the whole file with the
   ratings folded in, formatted exactly like the current one, so the diff is
   only the `rating` lines.
2. Paste it over `data/wineries.json`, commit, push.
3. Every device picks it up within about five minutes.

Once the file agrees with the overlay, the overlay entry is dropped and the bar
disappears on the next load — so a visible bar always means genuinely unsynced
work. Clearing a rating exports as `null` rather than reverting to the file
value, so deletions travel too.

### Cache busting after a deploy

The site sits behind a CDN that caches assets for hours, so a plain push can
leave visitors on the old JavaScript. Asset URLs therefore carry a `?v=` marker:

- `index.html` — `assets/style.css?v=N` and `assets/app.js?v=N`

**Bump `N` in the same commit as any change to those files.** A new URL is a
guaranteed miss at the edge; purging the CDN by hand is the fallback, not the plan.

`data/wineries.json` is the exception: its fetch appends a five-minute time
bucket, so pushed ratings reach your other devices on their own without anyone
remembering to bump anything. The file is a few KB, so the extra misses are free.

### Finding coordinates

Right-click the winery in Google Maps and copy the `lat, long` pair, or:

```bash
curl -A "winery-tracker" \
  "https://nominatim.openstreetmap.org/search?street=8700+Conn+Creek+Road&county=Napa&state=California&country=USA&format=json&limit=1"
```

## Local preview

The page fetches `data/wineries.json`, which browsers block over `file://`, so use
a local server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Validating before you push

```bash
python3 -m json.tool data/wineries.json > /dev/null && echo "valid"
```
