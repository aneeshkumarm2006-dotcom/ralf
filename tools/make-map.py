# Renders an OSM extract of Vieux-Montreal into ../ralf-map.svg: the styled
# basemap behind the contact page's map plate, in the heirloom palette.
#
# The plate carries no pin and no place names. The pin is a DOM element laid
# over the SVG in contact.html (so it can use the real wolf PNG), and the labels
# are spans (so they get Policy Gothic -- an <img>-loaded SVG cannot reach the
# page's webfonts). This script prints the markup for both; paste it in.
#
# To regenerate:
#   1. curl -s -X POST --data-urlencode "data@vieux-montreal.overpass.ql" \
#        https://overpass-api.de/api/interpreter -o osm.json
#      (the main instance is often busy -- https://overpass.private.coffee
#      and https://overpass.kumi.systems run the same API)
#   2. python make-map.py
#   3. paste the two printed blocks into contact.html
#
# Data (c) OpenStreetMap contributors, ODbL -- the credit in the corner of the
# plate is required, don't drop it.
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'osm.json')
OUT = os.path.join(HERE, os.pardir, 'ralf-map.svg')

# the address. The data covers a wider box than we draw — the view below is
# tighter so Vieux-Montréal fills the plate and streets stay legible at the
# ~510px the map actually renders at. Anything outside simply clips.
PIN = (45.5078562, -73.5540584)
S, W, N, E = 45.50229, -73.5605, 45.51071, -73.5445

VB_W = 1200.0
ASPECT = 4 / 3          # must match .contact-map's aspect-ratio exactly, so the
                        # plate never crops and the pin's % position stays true

# ---- heirloom palette ----
# Land sits a step darker than the page cream so the near-white roads read as a
# network rather than a texture; water carries the only cool note on the site,
# which is what stops the river reading as another park.
C_LAND   = '#eee0be'
C_PARK   = '#ded7ab'
C_WATER  = '#c2c8c9'
C_WATER_EDGE = '#b3babc'
C_CASING = '#dcc79c'
C_ROAD   = '#fdf9f0'
C_ROAD_HI= '#fffefa'
C_RAIL   = '#c6b18c'
C_LABEL  = '#7a5842'

def merc(lat, lon):
    """Web Mercator, in arbitrary units."""
    x = math.radians(lon)
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return x, y

# project the requested bbox, then pad the short side so the plate is exactly 4:3
x0, y0 = merc(S, W)
x1, y1 = merc(N, E)
minx, maxx = min(x0, x1), max(x0, x1)
miny, maxy = min(y0, y1), max(y0, y1)
w, h = maxx - minx, maxy - miny
if w / h < ASPECT:                       # too tall -> widen
    need = h * ASPECT
    pad = (need - w) / 2
    minx -= pad; maxx += pad
else:                                    # too wide -> heighten
    need = w / ASPECT
    pad = (need - h) / 2
    miny -= pad; maxy += pad
w, h = maxx - minx, maxy - miny
VB_H = VB_W / ASPECT
SCALE = VB_W / w

def pt(lat, lon):
    x, y = merc(lat, lon)
    return ((x - minx) * SCALE, (maxy - y) * SCALE)   # y flips: SVG grows downward

def path_from(geom, close=False):
    if not geom:
        return None
    d = []
    last = None
    for g in geom:
        x, y = pt(g['lat'], g['lon'])
        s = '%.1f %.1f' % (x, y)
        if s == last:            # drop duplicates created by rounding
            continue
        d.append(('M' if not d else 'L') + s)
        last = s
    if len(d) < 2:
        return None
    return ''.join(d) + ('Z' if close else '')

els = json.load(open(SRC, encoding='utf-8'))['elements']

water, parks, rails = [], [], []
roads = {k: [] for k in ('trunk', 'primary', 'secondary', 'tertiary', 'residential', 'pedestrian')}

RANK = {
    'motorway': 'trunk', 'motorway_link': 'trunk', 'trunk': 'trunk', 'trunk_link': 'trunk',
    'primary': 'primary', 'primary_link': 'primary',
    'secondary': 'secondary', 'secondary_link': 'secondary',
    'tertiary': 'tertiary', 'tertiary_link': 'tertiary',
    'residential': 'residential', 'unclassified': 'residential', 'living_street': 'residential',
    'pedestrian': 'pedestrian',
}

for e in els:
    t = e.get('tags', {})
    if e['type'] == 'relation':
        # multipolygon water: fill every outer ring, punch every inner one
        if t.get('natural') == 'water' or t.get('waterway') == 'riverbank':
            for m in e.get('members', []):
                p = path_from(m.get('geometry'), close=True)
                if p:
                    water.append((p, m.get('role') == 'inner'))
        continue
    geom = e.get('geometry')
    if t.get('natural') == 'water' or t.get('waterway') == 'riverbank':
        p = path_from(geom, close=True)
        if p: water.append((p, False))
    elif t.get('leisure') in ('park', 'garden', 'pitch') or t.get('landuse') in ('grass', 'forest', 'cemetery'):
        p = path_from(geom, close=True)
        if p: parks.append(p)
    elif t.get('railway') == 'rail':
        p = path_from(geom)
        if p: rails.append(p)
    elif 'highway' in t:
        r = RANK.get(t['highway'])
        if r:
            p = path_from(geom)
            if p: roads[r].append(p)

# casing width, road width, colour. Sized for the ~510px the plate renders at,
# not for the 1200-unit viewBox — at that scale anything under ~5 units vanishes.
STYLE = {
    'trunk':       (19.0, 13.0, C_ROAD_HI),
    'primary':     (17.0, 11.5, C_ROAD_HI),
    'secondary':   (15.0, 10.0, C_ROAD),
    'tertiary':    (12.5, 8.2, C_ROAD),
    'residential': (9.5, 6.0, C_ROAD),
    'pedestrian':  (0.0, 4.0, C_ROAD),
}
ORDER = ['residential', 'pedestrian', 'tertiary', 'secondary', 'primary', 'trunk']

# a few anchors, placed at their real coordinates
# Labels are NOT drawn into the SVG. An <img>-loaded SVG cannot reach the page's
# webfonts, so they'd fall back to Georgia; instead the generator prints them as
# HTML spans to overlay on the plate, which puts them in Policy Gothic with the
# rest of the site's signage. (lat, lon, text, size class)
LABELS = [
    (45.50640, -73.55430, 'Vieux-Montréal', 'lg'),
    (45.50830, -73.55855, 'Chinatown', 'md'),
    (45.50415, -73.54980, 'Vieux-Port', 'md'),
    (45.50470, -73.55790, "Place d'Armes", 'sm'),
    (45.50980, -73.55480, 'Champ-de-Mars', 'sm'),
    # 'Fleuve Saint-Laurent' was dropped: at this scale it collided with
    # Vieux-Port and no stretch of open water is wide enough to hold it.
]

out = []
add = out.append
add('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" role="img" aria-label="Map of Vieux-Montréal showing The Ralf at 164 Rue Notre-Dame Est">'
    % (VB_W, VB_H, VB_W, VB_H))
add('<title>Vieux-Montréal</title>')
add('<desc>Basemap drawn from OpenStreetMap data (ODbL) in The Ralf\'s heirloom palette.</desc>')
add('<rect width="%d" height="%d" fill="%s"/>' % (VB_W, VB_H, C_LAND))

if parks:
    add('<g fill="%s">' % C_PARK)
    for p in parks: add('<path d="%s"/>' % p)
    add('</g>')

if water:
    outer = [p for p, inner in water if not inner]
    inner = [p for p, inner in water if inner]
    add('<g fill="%s" stroke="%s" stroke-width="1">' % (C_WATER, C_WATER_EDGE))
    if outer: add('<path fill-rule="evenodd" d="%s"/>' % ''.join(outer + inner))
    add('</g>')

if rails:
    add('<g fill="none" stroke="%s" stroke-width="2.2" stroke-dasharray="9 7" stroke-linecap="butt">' % C_RAIL)
    for p in rails: add('<path d="%s"/>' % p)
    add('</g>')

# every casing first, so junctions knit together instead of showing seams
add('<g fill="none" stroke="%s" stroke-linecap="round" stroke-linejoin="round">' % C_CASING)
for rank in ORDER:
    cw, _, _ = STYLE[rank]
    if not roads[rank] or cw == 0: continue
    add('<g stroke-width="%.1f">' % cw)
    for p in roads[rank]: add('<path d="%s"/>' % p)
    add('</g>')
add('</g>')

add('<g fill="none" stroke-linecap="round" stroke-linejoin="round">')
for rank in ORDER:
    _, rw, col = STYLE[rank]
    if not roads[rank]: continue
    add('<g stroke="%s" stroke-width="%.1f">' % (col, rw))
    for p in roads[rank]: add('<path d="%s"/>' % p)
    add('</g>')
add('</g>')

# (no <text> — see LABELS above)
add('</svg>')

svg = '\n'.join(out)
with open(OUT, 'w', encoding='utf-8', newline='\r\n') as fh:
    fh.write(svg)

px, py = pt(*PIN)
print('wrote %s  (%.1f KB)' % (OUT, len(svg.encode('utf-8')) / 1024))
print('viewBox: %d x %.0f' % (VB_W, VB_H))
print('features: water=%d parks=%d rails=%d roads=%d' % (len(water), len(parks), len(rails), sum(len(v) for v in roads.values())))
print()
print('--- paste into contact.html: .contact-map style ---')
print('style="--pin-x:%.3f%%; --pin-y:%.3f%%"' % (px / VB_W * 100, py / VB_H * 100))
print()
print('--- paste into contact.html: label overlay ---')
for lat, lon, text, cls in LABELS:
    x, y = pt(lat, lon)
    fx, fy = x / VB_W * 100, y / VB_H * 100
    warn = '   <-- OFF-PLATE' if not (0 < fx < 100 and 0 < fy < 100) else ''
    print('<span class="map-label %s" style="--x:%.2f%%; --y:%.2f%%">%s</span>%s'
          % (cls, fx, fy, text, warn))
