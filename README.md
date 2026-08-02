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

Because the site is static with no backend, ratings are saved in the browser's
`localStorage` under `winery-tracker:ratings` — they persist on that browser but
don't follow you to another device or sync to the repo. To make a rating
permanent for everyone, set `rating` in `data/wineries.json`; a stored rating for
the same winery takes precedence over the JSON value on that browser.

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
