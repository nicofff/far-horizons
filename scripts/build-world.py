# /// script
# dependencies = ["pillow==12.0.0", "numpy==2.3.4", "scipy==1.16.3", "pyshp==3.0.3"]
# ///
"""Rasterize Natural Earth coastlines and gazetteer locations for the game."""
from pathlib import Path
import base64
import hashlib
import heapq
import io
import json
import urllib.request
import zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
import shapefile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tmp/geography'
ASSETS = ROOT / 'assets'
WIDTH, HEIGHT, SCALE = 7200, 3600, 20
PINNED = json.loads((ROOT / 'geography/manifest.json').read_text()).get('sources', {}) if (ROOT / 'geography/manifest.json').exists() else {}
SOURCES = {
    'land': ('10m_physical', 'ne_10m_land'),
    'rivers': ('10m_physical', 'ne_10m_rivers_lake_centerlines'),
    'places': ('10m_cultural', 'ne_10m_populated_places_simple'),
}

def source(kind):
    group, name = SOURCES[kind]
    path = CACHE / (name + '.zip')
    url = f'https://naturalearth.s3.amazonaws.com/{group}/{name}.zip'
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url).read())
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    expected = PINNED.get(kind, {}).get('sha256')
    if expected and digest != expected:
        raise ValueError(f'Source archive checksum changed: {path}')
    archive = zipfile.ZipFile(path)
    return shapefile.Reader(shp=io.BytesIO(archive.read(name + '.shp')), dbf=io.BytesIO(archive.read(name + '.dbf')), encoding='utf-8')

def pixel(lon, lat):
    return (lon + 180) * SCALE, (90 - lat) * SCALE

def world(px, py):
    return {'x': round((px + .5) / 4, 4), 'y': round((py + .5) / 4, 4)}

def encode_runs(values):
    data = bytearray()
    changes = np.flatnonzero(np.diff(values)) + 1
    ends = np.concatenate(([0], changes, [len(values)]))
    runs = np.diff(ends).tolist()
    if values[0]:
        runs.insert(0, 0)
    for length in runs:
        while length >= 128:
            data.append((length & 127) | 128)
            length >>= 7
        data.append(length)
    return base64.b64encode(data).decode()

def passage_path(detail, box, start, end, factor):
    land = np.asarray(detail)
    height, width = land.shape
    def endpoint(coordinates):
        px, py = pixel(*coordinates)
        x, y = round((px-box[0])*factor), round((py-box[1])*factor)
        if not (0 <= x < width and 0 <= y < height) or land[y,x]:
            raise ValueError(f'Passage endpoint must occupy source water: {coordinates}')
        return y*width+x
    first, last = endpoint(start), endpoint(end)
    costs = np.full(width*height, np.inf)
    previous = np.full(width*height, -1, dtype=np.int32)
    costs[first] = 0
    pending = [(0, 0, first)]
    while pending:
        _, cost, current = heapq.heappop(pending)
        if cost > costs[current]:
            continue
        if current == last:
            path = []
            while current != -1:
                path.append((box[0]+(current%width+.5)/factor, box[1]+(current//width+.5)/factor))
                current = previous[current]
            return path[::-1]
        x, y = current%width, current//width
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
            nx, ny = x+dx, y+dy
            if not (0 <= nx < width and 0 <= ny < height) or land[ny,nx]:
                continue
            if dx and dy and (land[y,nx] or land[ny,x]):
                continue
            neighbor = ny*width+nx
            candidate = cost + np.hypot(dx,dy)
            if candidate < costs[neighbor]:
                costs[neighbor], previous[neighbor] = candidate, current
                heuristic = np.hypot(nx-last%width, ny-last//width)
                heapq.heappush(pending, (candidate+heuristic, candidate, neighbor))
    raise ValueError(f'No source-water passage between {start} and {end}')

CACHE.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(exist_ok=True)
image = Image.new('L', (WIDTH, HEIGHT))
draw = ImageDraw.Draw(image)
for record in source('land').iterShapes():
    geometry = record.__geo_interface__
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        draw.polygon([pixel(*p) for p in polygon[0]], fill=1)
        for hole in polygon[1:]:
            draw.polygon([pixel(*p) for p in hole], fill=0)

# At this resolution river harbors need a minimum channel width to remain navigable.
base_water, _ = ndimage.label(np.asarray(image) == 0)
base_ocean = base_water == base_water[1800, 800]
river_windows = {'Thames': (-.35, 51.35, 1.1, 51.8), 'Guadalquivir': (-6.6, 36.7, -5.7, 37.5), 'Elbe': (8.3, 53.4, 10.15, 54.1), 'Scheldt': (3.1, 51.1, 4.6, 51.7), 'Garonne': (-1.25, 44.7, -.4, 45.7)}
river_windows.update({
    'Loire': (-2.3, 47.0, -1.3, 47.5),
    'Danube': (20.2, 43.5, 30.0, 46.0),
    'Chilia branch': (28.5, 44.8, 30.0, 45.6),
    'Sfântu Gheorghe branch': (28.5, 44.8, 30.0, 45.6),
    'Niger': (-4.5, 4.0, 7.0, 17.2),
    'Shatt al-Arab': (47.4, 29.7, 48.8, 30.8),
    'Red': (105.5, 20.0, 106.8, 21.3),
    'Wei': (108.5, 34.0, 110.5, 35.3),
    'Yellow': (110.0, 34.3, 119.6, 38.0),
    'Nile': (30.2, 15.5, 34.2, 31.7),
    'Rosetta Branch': (30.2, 29.7, 31.9, 31.7),
    'Damietta Branch': (30.2, 29.7, 31.9, 31.7),
})
for record in source('rivers').iterShapeRecords():
    attrs = record.record.as_dict()
    bounds = river_windows.get(attrs['name_en'])
    if not bounds:
        continue
    left, bottom, right, top = bounds
    # Three-cell strokes keep sharp river bends connected through shared water edges.
    channel_width = 2 if attrs['name_en'] in ['Thames', 'Guadalquivir', 'Elbe', 'Scheldt', 'Garonne'] else 3
    overlay = Image.new('L', image.size, 1)
    line = ImageDraw.Draw(overlay)
    parts = list(record.shape.parts) + [len(record.shape.points)]
    for a, b in zip(parts, parts[1:]):
        points = record.shape.points[a:b]
        line.line([pixel(*p) for p in points], fill=0, width=channel_width)
        # The river layer stops before some tidal estuaries in the land layer.
        extensions = []
        for endpoint in [points[0], points[-1]]:
            ex, ey = pixel(*endpoint)
            x0, y0 = int(ex)-20, int(ey)-20
            yy, xx = np.nonzero(base_ocean[y0:y0+41, x0:x0+41])
            if len(xx):
                distances = (xx+x0-ex)**2 + (yy+y0-ey)**2
                nearest = np.argmin(distances)
                extensions.append((distances[nearest], (ex, ey), (int(xx[nearest]+x0), int(yy[nearest]+y0))))
        if extensions:
            _, endpoint, coast = min(extensions)
            line.line([endpoint, coast], fill=0, width=channel_width)
    x0, y0 = pixel(left, top)
    x1, y1 = pixel(right, bottom)
    box = tuple(map(round, (x0, y0, x1, y1)))
    patch = np.minimum(np.asarray(image.crop(box)), np.asarray(overlay.crop(box)))
    image.paste(Image.fromarray(patch), box[:2])

# Sample narrow straits at higher resolution before reducing them to game cells.
strait_windows = [(25.8,39.7,29.4,41.5), (15.3,37.9,15.8,38.4), (9.4,54.5,13.1,56.3), (17.8,59.0,19.0,59.6), (36.2,45.0,36.9,45.6), (10.2,59.1,10.9,60.0), (16.4,68.0,17.7,68.65), (-135.0,57.5,-133.9,58.6)]
open_water_windows = [(130.5,32.6,135.7,35.1), (139.65,41.05,142.0,42.0), (104.8,-6.9,106.4,-5.3)]
strait_windows += open_water_windows
clearance_windows = [(102.2,.4,104.8,2.2), (21.8,58.35,23.95,59.2)]
clearance_passages = [
    {'name':'Singapore Strait', 'approaches':[(103.3,1.3),(103.85,1.15),(104.7,1.3)], 'widthCells':3},
    {'name':'Durian approach', 'approaches':[(103.65,1.2),(103.65,.65)], 'widthCells':3},
    {'name':'Hari and Suur straits', 'approaches':[(23.1,59.1),(23.3,58.8),(23.55,58.4)], 'widthCells':3},
    {'name':'Soela Strait', 'approaches':[(22.3,58.7),(22.65,58.7),(23.3,58.8)], 'widthCells':3},
    {'name':'Voosi Strait', 'approaches':[(23.5,59.1),(23.4,58.85)], 'widthCells':3},
]
strait_windows += clearance_windows
for left,bottom,right,top in strait_windows:
    factor=16
    x0,y0=pixel(left,top);x1,y1=pixel(right,bottom)
    box=tuple(map(round,(x0,y0,x1,y1)));width,height=box[2]-box[0],box[3]-box[1]
    detail=Image.new('L',(width*factor,height*factor))
    painter=ImageDraw.Draw(detail)
    for record in source('land').iterShapes():
        minx,miny,maxx,maxy=record.bbox
        if maxx<left or minx>right or maxy<bottom or miny>top:
            continue
        geometry=record.__geo_interface__
        polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
        for polygon in polygons:
            for index,ring in enumerate(polygon):
                coords=[((pixel(*p)[0]-box[0])*factor,(pixel(*p)[1]-box[1])*factor) for p in ring]
                painter.polygon(coords,fill=1 if index==0 else 0)
    reduced=np.asarray(detail).reshape(height,factor,width,factor).min(axis=(1,3))
    patch = Image.fromarray(reduced)
    if (left,bottom,right,top) in clearance_windows:
        # Widen a route through source water instead of shrinking every small island.
        for passage in clearance_passages:
            if not all(left<=lon<=right and bottom<=lat<=top for lon,lat in passage['approaches']):
                continue
            for start, end in zip(passage['approaches'],passage['approaches'][1:]):
                path = passage_path(detail,box,start,end,factor)
                ImageDraw.Draw(image).line(path,fill=0,width=passage['widthCells'])
    elif (left,bottom,right,top) in open_water_windows:
        image.paste(Image.fromarray(np.minimum(np.asarray(image.crop(box)),reduced)),box[:2])
    else:
        image.paste(patch,box[:2])
image.point(lambda p:p*255).save(CACHE / 'land-mask.png')
mask = np.array(image, dtype=np.uint8)
water, _ = ndimage.label(mask == 0)
ocean_id = water[1800, 800]
ocean = water == ocean_id
print('Ocean cells:', int(ocean.sum()))

places = [r.record.as_dict() for r in source('places').iterShapeRecords()]
selection = json.loads((ROOT / 'geography/ports.json').read_text())
ports = {}
issues = []
for entry in selection:
    candidates = [p for p in places if entry['place'] in [p['name'], p['nameascii']] and (not entry.get('country') or p['adm0name'] == entry['country'])]
    if not candidates and not entry.get('coordinates'):
        issues.append(f'Gazetteer place not found: {entry}')
        continue
    place = max(candidates, key=lambda p: p['pop_max']) if candidates else {'name':entry['place'],'ne_id':None}
    if entry.get('coordinates'):
        lon, lat = entry['coordinates']['lon'], entry['coordinates']['lat']
    else:
        lon, lat = place['longitude'], place['latitude']
    px, py = pixel(lon, lat)
    radius = 40
    x0, y0 = max(0, int(px)-radius), max(0, int(py)-radius)
    crop = ocean[y0:min(HEIGHT, int(py)+radius+1), x0:min(WIDTH, int(px)+radius+1)]
    yy, xx = np.nonzero(crop)
    if not len(xx):
        issues.append(f'No ocean approach within two degrees: {entry["id"]}')
        continue
    nearest = np.argmin((xx+x0+.5-px)**2 + (yy+y0+.5-py)**2)
    anchor = world(xx[nearest]+x0, yy[nearest]+y0)
    ly, lx = np.nonzero(mask[max(0,int(py)-8):int(py)+9,max(0,int(px)-8):int(px)+9])
    if not len(lx):
        issues.append(f'No land for town near source coordinates: {entry["id"]}')
        continue
    tx0, ty0 = max(0,int(px)-8), max(0,int(py)-8)
    if entry.get('townBank')=='north':
        keep=ly+ty0+.5<py
        lx,ly=lx[keep],ly[keep]
    closest = np.argmin((lx+tx0+.5-px)**2+(ly+ty0+.5-py)**2)
    town = world(lx[closest]+tx0, ly[closest]+ty0)
    if entry.get('townOffsetFromHarbor'):
        town = {axis:round(anchor[axis]+entry['townOffsetFromHarbor'][axis],4) for axis in ['x','y']}
        if not mask[int(town['y']*4),int(town['x']*4)]:
            issues.append(f'Town offset must occupy land: {entry["id"]}')
    ports[entry['id']] = anchor | {'town':town, 'coordinates':{'lon':lon,'lat':lat}, 'gazetteerId':str(place['ne_id']) if place['ne_id'] else None, 'place':place['name'], 'source':entry.get('source', 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/')}
    for key in ['rosterName', 'locationNote']:
        if key in entry:
            ports[entry['id']][key] = entry[key]
    print(entry['id'], place['name'], round(np.hypot(anchor['x']-(lon+180)*5, anchor['y']-(90-lat)*5),2),'world units from city')

landmarks = []
for entry in json.loads((ROOT / 'geography/landmarks.json').read_text()):
    px, py = pixel(entry['lon'], entry['lat'])
    x0, y0 = max(0, int(px)-40), max(0, int(py)-40)
    yy, xx = np.nonzero(ocean[y0:min(HEIGHT, int(py)+41), x0:min(WIDTH, int(px)+41)])
    if not len(xx):
        issues.append(f'No ocean approach to landmark: {entry["id"]}')
        continue
    nearest = np.argmin((xx+x0+.5-px)**2 + (yy+y0+.5-py)**2)
    approach = world(xx[nearest]+x0, yy[nearest]+y0)
    site = {'x':(entry['lon']+180)*5, 'y':(90-entry['lat'])*5}
    gap = float(np.hypot(approach['x']-site['x'], approach['y']-site['y']))
    if gap > 3:
        issues.append(f'Landmark too far inland to explore from shore: {entry["id"]}: {gap:.2f}')
    landmarks.append(entry | site | {'approach':approach, 'discoveryRadius':round(max(1.2, gap+.4), 3)})
    print('Landmark:', entry['id'], round(gap, 2), 'world units from navigable water')

if issues:
    raise ValueError('\n'.join(issues))
encoded = encode_runs(mask.ravel())
(ASSETS / 'world-terrain.js').write_text(f'export const rasterWidth={WIDTH},rasterHeight={HEIGHT},rasterCell=.25;\nexport const terrainRuns="{encoded}";\n')
(ASSETS / 'world-ports.js').write_text('export const portLocations='+json.dumps(ports,separators=(',',':'))+';\n')
(ASSETS / 'world-landmarks.js').write_text('export const landmarks='+json.dumps(landmarks,separators=(',',':'))+';\n')
palette = np.array([[40,101,206],[56,173,73]], dtype=np.uint8)
rgb = palette[mask]
coast = (mask == 1) & (np.asarray(image.filter(ImageFilter.MinFilter(3))) == 0)
rgb[coast] = [214,189,98]
Image.fromarray(rgb).save(ASSETS / 'world-map.png', optimize=True)
image.point(lambda p: p*255).save(CACHE / 'land-mask.png')
manifest = {'projection':'Equirectangular, longitude -180..180, latitude 90..-90','raster':[WIDTH,HEIGHT],'degreesPerPixel':.05,'worldUnitsPerPixel':.25,'riverChannels':river_windows,'supersampledStraits':strait_windows,'widenedPassages':{'windows':clearance_windows,'passages':clearance_passages},'sources':{kind:{'url':f'https://naturalearth.s3.amazonaws.com/{group}/{name}.zip','sha256':hashlib.sha256((CACHE/(name+'.zip')).read_bytes()).hexdigest()} for kind,(group,name) in SOURCES.items()}}
(ROOT / 'geography/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Encoded terrain:',len(encoded),'bytes;',len(ports),'port positions')
