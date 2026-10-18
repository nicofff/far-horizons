# /// script
# dependencies = ["pillow==12.0.0", "numpy==2.3.4", "scipy==1.16.3", "pyshp==3.0.3"]
# ///
"""Rasterize RESOLVE ecoregions as a visual layer over the sailing terrain."""
from pathlib import Path
import base64
import hashlib
import io
import json
import re
import urllib.request
import zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
import shapefile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tmp/biomes'
CACHE.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT, SCALE = 3600, 1800, 10
URL = 'https://storage.googleapis.com/teow2016/Ecoregions2017.zip'
manifest_path = ROOT / 'geography/biomes-manifest.json'
archive_path = CACHE / 'Ecoregions2017.zip'
if not archive_path.exists():
    urllib.request.urlretrieve(URL, archive_path)
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
if manifest_path.exists() and json.loads(manifest_path.read_text())['source']['sha256'] != digest:
    raise ValueError('Ecoregion archive checksum changed.')
archive = zipfile.ZipFile(archive_path)
reader = shapefile.Reader(shp=io.BytesIO(archive.read('Ecoregions2017.shp')), dbf=io.BytesIO(archive.read('Ecoregions2017.dbf')), encoding='cp1252')
image = Image.new('L', (WIDTH, HEIGHT))
for record in reader.iterShapeRecords():
    attrs = record.record.as_dict()
    biome = 15 if attrs['ECO_NAME'] == 'Rock and Ice' else int(attrs['BIOME_NUM'])
    if not 1 <= biome <= 15:
        raise ValueError(f'Unknown biome: {attrs}')
    minx, miny, maxx, maxy = record.shape.bbox
    box = (max(0, int((minx+180)*SCALE)), max(0, int((90-maxy)*SCALE)), min(WIDTH, int((maxx+180)*SCALE)+1), min(HEIGHT, int((90-miny)*SCALE)+1))
    if box[0] >= box[2] or box[1] >= box[3]:
        continue
    coverage = Image.new('L', (box[2]-box[0], box[3]-box[1]))
    painter = ImageDraw.Draw(coverage)
    geometry = record.shape.__geo_interface__
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        for index, ring in enumerate(polygon):
            painter.polygon([((lon+180)*SCALE-box[0], (90-lat)*SCALE-box[1]) for lon, lat in ring], fill=255 if index == 0 else 0)
    image.paste(biome, box, coverage)

terrain_path = ROOT / 'assets/world-terrain.js'
terrain_source = terrain_path.read_text()
runs = base64.b64decode(re.search(r'terrainRuns="([^"]+)"', terrain_source)[1])
terrain = np.zeros(7200*3600, dtype=np.uint8)
position, value, length, shift = 0, 0, 0, 0
for byte in runs:
    length |= (byte & 127) << shift
    if byte & 128:
        shift += 7
        continue
    terrain[position:position+length] = value
    position += length
    value ^= 1
    length, shift = 0, 0
if position != terrain.size:
    raise ValueError('Invalid terrain raster.')
terrain = terrain.reshape(3600, 7200)
land = terrain.reshape(HEIGHT, 2, WIDTH, 2).max(axis=(1, 3)) != 0
biomes = np.array(image)
if not set(range(1, 16)).issubset(set(np.unique(biomes))):
    raise ValueError('Source raster is missing biome classes.')
missing = land & (biomes == 0)
if missing.any():
    # Ecoregion and coastline datasets disagree on small islands and shore cells.
    nearest = ndimage.distance_transform_edt(biomes == 0, return_distances=False, return_indices=True)
    biomes[missing] = biomes[nearest[0][missing], nearest[1][missing]]
biomes[~land] = 0

flat = biomes.ravel()
ends = np.concatenate(([0], np.flatnonzero(np.diff(flat)) + 1, [len(flat)]))
encoded = bytearray()
for start, end in zip(ends, ends[1:]):
    encoded.append(int(flat[start]))
    length = int(end-start)
    while length >= 128:
        encoded.append((length & 127) | 128)
        length >>= 7
    encoded.append(length)
styles = json.loads((ROOT / 'geography/biomes.json').read_text())
(ROOT / 'assets/world-biomes.js').write_text('export const biomeWidth=3600,biomeHeight=1800,biomeCell=.5;\nexport const biomeRuns="'+base64.b64encode(encoded).decode()+'";\nexport const biomeStyles='+json.dumps(styles,separators=(',', ':'))+';\n')
palette = np.zeros((16, 3), dtype=np.uint8)
palette[0] = [40, 101, 206]
for key, style in styles.items():
    palette[int(key)] = [int(style['ground'][0][i:i+2], 16) for i in (1, 3, 5)]
expanded = np.repeat(np.repeat(biomes, 2, axis=0), 2, axis=1)
rgb = palette[expanded]
rgb[terrain == 0] = palette[0]
coast = (terrain == 1) & (np.array(Image.fromarray(terrain).filter(ImageFilter.MinFilter(3))) == 0)
for key, style in styles.items():
    rgb[coast & (expanded == int(key))] = [int(style['shore'][0][i:i+2], 16) for i in (1, 3, 5)]
Image.fromarray(rgb).save(ROOT / 'assets/world-biomes.png', optimize=True)
manifest = {'source':{'url':URL,'sha256':digest,'name':'RESOLVE Ecoregions 2017, Dinerstein et al.','license':'CC-BY-4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','documentation':'https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017'},'raster':[WIDTH,HEIGHT],'degreesPerPixel':.1,'worldUnitsPerPixel':.5,'terrainSha256':hashlib.sha256(terrain_path.read_bytes()).hexdigest(),'adaptations':['Rasterized biome numbers 1–14; Rock and Ice mapped to 15.','Coastal gaps use the nearest sourced ecoregion.','Game colors and scenery are original interpretations; this is not a historical vegetation survey.']}
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
print('Biome cells:', int(land.sum()), 'Coastal gaps filled:', int(missing.sum()), 'Encoded bytes:', len(encoded))
