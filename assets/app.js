/* Winery Tracker — loads data/wineries.json and renders stats, a map, and a filtered list. */

(function () {
  'use strict';

  var state = {
    wineries: [],
    status: 'all',
    region: 'all',
    sort: 'date',
    query: ''
  };

  var map = null;
  var markerLayer = null;
  var markers = [];

  var els = {
    stats: document.getElementById('stats'),
    results: document.getElementById('results'),
    regionFilter: document.getElementById('region-filter'),
    sort: document.getElementById('sort'),
    search: document.getElementById('search'),
    mapNote: document.getElementById('map-note'),
    segmented: document.querySelector('.segmented')
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Dates are plain YYYY-MM-DD; parse as local so they don't shift a day in western timezones.
  function parseDate(iso) {
    if (!iso) return null;
    var p = String(iso).split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function stars(rating) {
    if (rating == null || isNaN(rating)) return '';
    var out = '';
    for (var i = 1; i <= 5; i++) {
      if (rating >= i) out += '★';
      else if (rating >= i - 0.5) out += '½';
      else out += '<span class="empty">★</span>';
    }
    return '<span class="stars" title="' + rating + ' out of 5">' + out + '</span>';
  }

  function isVisited(w) {
    return w.status === 'visited';
  }

  /* ---------- filtering & sorting ---------- */

  function visible() {
    var q = state.query.trim().toLowerCase();

    return state.wineries.filter(function (w) {
      if (state.status !== 'all' && w.status !== state.status) return false;
      if (state.region !== 'all' && w.region !== state.region) return false;
      if (!q) return true;
      return [w.name, w.region, w.area, w.notes].some(function (f) {
        return f && String(f).toLowerCase().indexOf(q) !== -1;
      });
    }).sort(sorter);
  }

  function sorter(a, b) {
    switch (state.sort) {
      case 'rating':
        // Unrated sinks to the bottom rather than sorting as a zero.
        var ra = a.rating == null ? -1 : a.rating;
        var rb = b.rating == null ? -1 : b.rating;
        return rb - ra || a.name.localeCompare(b.name);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'region':
        return (a.region || '').localeCompare(b.region || '') || a.name.localeCompare(b.name);
      default: // most recent visit first, unvisited last
        if (!a.date && !b.date) return a.name.localeCompare(b.name);
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
    }
  }

  /* ---------- rendering ---------- */

  function renderStats() {
    var visited = state.wineries.filter(isVisited);
    var toVisit = state.wineries.filter(function (w) { return !isVisited(w); });
    var rated = visited.filter(function (w) { return typeof w.rating === 'number'; });

    var avg = rated.length
      ? (rated.reduce(function (sum, w) { return sum + w.rating; }, 0) / rated.length).toFixed(1)
      : '—';

    var regions = new Set(state.wineries.map(function (w) { return w.region; }).filter(Boolean));

    var cells = [
      ['Visited', visited.length],
      ['To visit', toVisit.length],
      ['Avg rating', avg],
      ['Regions', regions.size]
    ];

    els.stats.innerHTML = cells.map(function (c) {
      return '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>';
    }).join('');
  }

  function renderRegionOptions() {
    var regions = Array.from(new Set(
      state.wineries.map(function (w) { return w.region; }).filter(Boolean)
    )).sort();

    els.regionFilter.innerHTML = '<option value="all">All regions</option>' +
      regions.map(function (r) {
        return '<option value="' + esc(r) + '">' + esc(r) + '</option>';
      }).join('');
  }

  function cardHTML(w) {
    var visitedClass = isVisited(w) ? ' card--visited' : '';
    var title = w.website
      ? '<a href="' + esc(w.website) + '" target="_blank" rel="noopener noreferrer">' + esc(w.name) + '</a>'
      : esc(w.name);

    var meta = [];
    meta.push('<span class="badge badge--' + esc(w.status) + '">' +
      (isVisited(w) ? 'Visited' : 'To visit') + '</span>');
    if (w.date) meta.push('<span>' + esc(formatDate(w.date)) + '</span>');
    if (w.area && w.area !== w.region) meta.push('<span>' + esc(w.area) + '</span>');
    if (w.rating != null) meta.push(stars(w.rating));

    return '<article class="card' + visitedClass + '">' +
      '<h3>' + title + '</h3>' +
      '<div class="card-meta">' + meta.join('') + '</div>' +
      (w.notes ? '<p class="card-notes">' + esc(w.notes) + '</p>' : '') +
      (w.website ? '<a class="card-link" href="' + esc(w.website) +
        '" target="_blank" rel="noopener noreferrer">Website →</a>' : '') +
      '</article>';
  }

  function renderList(list) {
    if (!list.length) {
      els.results.innerHTML = '<p class="empty-state">No wineries match these filters.</p>';
      return;
    }

    // Grouping by region only makes sense when the sort isn't already about something else.
    if (state.sort !== 'region') {
      els.results.innerHTML = '<div class="cards">' + list.map(cardHTML).join('') + '</div>';
      return;
    }

    var groups = [];
    var byRegion = {};
    list.forEach(function (w) {
      var key = w.region || 'Unsorted';
      if (!byRegion[key]) {
        byRegion[key] = [];
        groups.push(key);
      }
      byRegion[key].push(w);
    });

    els.results.innerHTML = groups.map(function (region) {
      var items = byRegion[region];
      return '<section class="region-group">' +
        '<div class="region-head"><h2>' + esc(region) + '</h2>' +
        '<span>' + items.length + (items.length === 1 ? ' winery' : ' wineries') + '</span></div>' +
        '<div class="cards">' + items.map(cardHTML).join('') + '</div>' +
        '</section>';
    }).join('');
  }

  /* ---------- map ---------- */

  // The map is a nice-to-have: if Leaflet is missing or blows up, the list still renders.
  function initMap() {
    if (typeof L === 'undefined') {
      hideMap('Map unavailable — Leaflet failed to load.');
      return;
    }

    try {
      map = L.map('map', { scrollWheelZoom: false }).setView([38.4, -122.4], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      markerLayer = L.layerGroup().addTo(map);
    } catch (err) {
      map = null;
      hideMap('Map unavailable — ' + err.message);
    }
  }

  function hideMap(message) {
    var el = document.getElementById('map');
    if (el) el.hidden = true;
    els.mapNote.hidden = false;
    els.mapNote.textContent = message;
  }

  function popupHTML(w) {
    var bits = '<b>' + esc(w.name) + '</b>';
    var meta = [w.region, isVisited(w) ? formatDate(w.date) || 'Visited' : 'On the list'].filter(Boolean);
    bits += '<p class="popup-meta">' + esc(meta.join(' · ')) + '</p>';
    if (w.rating != null) bits += '<p class="popup-meta">' + stars(w.rating) + '</p>';
    if (w.notes) bits += '<p class="popup-notes">' + esc(w.notes) + '</p>';
    if (w.website) {
      bits += '<p class="popup-notes"><a href="' + esc(w.website) +
        '" target="_blank" rel="noopener noreferrer">Website →</a></p>';
    }
    return bits;
  }

  function renderMap(list) {
    if (!map) return;

    markerLayer.clearLayers();
    markers = [];

    var missing = 0;

    list.forEach(function (w) {
      if (!Array.isArray(w.coords) || w.coords.length !== 2) {
        missing++;
        return;
      }

      var icon = L.divIcon({
        className: '',
        html: '<div class="pin pin--' + (isVisited(w) ? 'visited' : 'to-visit') + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10]
      });

      var marker = L.marker(w.coords, { icon: icon, title: w.name })
        .bindPopup(popupHTML(w));

      markerLayer.addLayer(marker);
      markers.push(marker);
    });

    if (markers.length) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.18), { maxZoom: 13 });
    }

    if (missing) {
      els.mapNote.hidden = false;
      els.mapNote.textContent = missing + (missing === 1 ? ' winery has' : ' wineries have') +
        ' no coordinates yet, so they appear in the list below but not on the map.';
    } else {
      els.mapNote.hidden = true;
    }
  }

  function render() {
    var list = visible();
    renderList(list);
    try {
      renderMap(list);
    } catch (err) {
      hideMap('Map unavailable — ' + err.message);
    }
  }

  /* ---------- events ---------- */

  function bindEvents() {
    els.segmented.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-status]');
      if (!btn) return;
      state.status = btn.dataset.status;
      Array.prototype.forEach.call(els.segmented.children, function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      render();
    });

    els.regionFilter.addEventListener('change', function () {
      state.region = this.value;
      render();
    });

    els.sort.addEventListener('change', function () {
      state.sort = this.value;
      render();
    });

    els.search.addEventListener('input', function () {
      state.query = this.value;
      render();
    });
  }

  /* ---------- boot ---------- */

  function fail(message) {
    els.results.innerHTML = '<div class="error-banner"><strong>Could not load the winery list.</strong><br>' +
      esc(message) + '</div>';
  }

  fetch('data/wineries.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching data/wineries.json');
      return res.json();
    })
    .then(function (data) {
      if (!Array.isArray(data)) throw new Error('wineries.json must contain a JSON array.');

      state.wineries = data.filter(function (w) { return w && w.name; });

      renderStats();
      renderRegionOptions();
      initMap();
      bindEvents();
      render();
    })
    .catch(function (err) {
      fail(err.message + ' — check that data/wineries.json is valid JSON.');
    });
})();
