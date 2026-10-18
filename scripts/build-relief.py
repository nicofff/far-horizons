# /// script
# dependencies = ["h5py==3.15.1", "numpy==2.3.4", "scipy==1.16.3"]
# ///
"""Reduce sourced global elevation to a compact mountain scenery layer."""
from pathlib import Path
import base64
import hashlib
import json
import urllib.request
import h5py
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tmp/relief'
CACHE.mkdir(parents=True, exist_ok=True)
URL = 'https://oceania.generic-mapping-tools.org/server/earth/earth_relief/earth_relief_10m_p.grd'
source_path = CACHE / 'earth_relief_10m_p.grd'
manifest_path = ROOT / 'geography/relief-manifest.json'
if not source_path.exists():
    urllib.request.urlretrieve(URL, source_path)
digest = hashlib.sha256(source_path.read_bytes()).hexdigest()
if manifest_path.exists() and json.loads(manifest_path.read_text())['source']['sha256'] != digest:
    raise ValueError('Relief source checksum changed.')
with h5py.File(source_path) as grid:
    lat, lon = grid['lat'][:], grid['lon'][:]
    if len(lat) != 1080 or len(lon) != 2160 or not np.allclose(lat[[0,-1]], [-90+1/12,90-1/12]) or not np.allclose(lon[[0,-1]], [-180+1/12,180-1/12]):
        raise ValueError('Unexpected relief registration.')
    z = grid['z']
    elevation = (z[:].astype(np.float32)*float(z.attrs['scale_factor'][0])+float(z.attrs.get('add_offset', [0])[0]))[::-1]
    title = grid.attrs['title'].decode()
    description = grid.attrs['description'].decode()
height = np.maximum(elevation, 0)
local_relief = ndimage.maximum_filter(height, size=3)-ndimage.minimum_filter(height, size=3)
strength = np.zeros(height.shape, dtype=np.uint8)
strength[(height >= 500) & (local_relief >= 400)] = 1
strength[(height >= 1000) & (local_relief >= 1000)] = 2
strength[(height >= 2000) & (local_relief >= 1800)] = 3
# Keep altitude and ruggedness independent so high flat plateaus do not become rows of peaks.
values = (np.clip(np.rint(height/250), 0, 63).astype(np.uint8)*4+strength).ravel()
ends = np.concatenate(([0], np.flatnonzero(np.diff(values))+1, [len(values)]))
encoded = bytearray()
for start, end in zip(ends, ends[1:]):
    encoded.append(int(values[start]))
    length = int(end-start)
    while length >= 128:
        encoded.append((length & 127) | 128)
        length >>= 7
    encoded.append(length)
asset_path = ROOT / 'assets/world-relief.js'
asset_path.write_text('export const reliefWidth=2160,reliefHeight=1080,reliefCell=5/6;\nexport const reliefRuns="'+base64.b64encode(encoded).decode()+'";\n')
manifest = {
    'source': {'url':URL, 'sha256':digest, 'name':title, 'description':description,
               'documentation':'https://www.generic-mapping-tools.org/remote-datasets/earth-relief.html',
               'citation':'Tozer et al. (2019), Global bathymetry and topography at 15 arc seconds: SRTM15+',
               'doi':'https://doi.org/10.1029/2019EA000658',
               'license':'CC-BY-4.0', 'licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
               'licenseReference':'https://figshare.com/articles/online_resource/Tozer_et_al_2019_SRTM15_GMT_Grids/7979780'},
    'projection':'Equirectangular, longitude -180..180, latitude 90..-90',
    'raster':[2160,1080], 'degreesPerPixel':1/6, 'worldUnitsPerPixel':5/6,
    'encoding':'Unsigned byte: upper six bits = elevation in 250 m steps, lower two bits = mountain strength 0..3; value and varint run lengths.',
    'mountainThresholds':[{'strength':1,'minimumElevation':500,'minimumLocalRelief':400},
                          {'strength':2,'minimumElevation':1000,'minimumLocalRelief':1000},
                          {'strength':3,'minimumElevation':2000,'minimumLocalRelief':1800}],
    'localReliefWindowCells':3, 'assetSha256':hashlib.sha256(asset_path.read_bytes()).hexdigest(),
    'adaptations':['Marine elevations are clamped to zero; the navigation mask remains authoritative.',
                   'Mountain sprites, exaggerated heights, colors and snow lines are original artistic interpretations.']}
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print('Mountain cells:', int(np.count_nonzero(strength)), 'Encoded bytes:', len(encoded))
