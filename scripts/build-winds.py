# /// script
# dependencies = ["h5py==3.15.1", "numpy==2.3.4", "scipy==1.16.3"]
# ///
"""Resample NOAA monthly surface-wind normals for offline sailing."""
from pathlib import Path
import base64
import hashlib
import json
import urllib.request
import h5py
import numpy as np
from scipy.interpolate import RegularGridInterpolator

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tmp/winds'
CACHE.mkdir(parents=True, exist_ok=True)
manifest_path = ROOT / 'geography/winds-manifest.json'
pinned = json.loads(manifest_path.read_text()).get('sources', {}) if manifest_path.exists() else {}
sources, components = {}, []
longitude = np.arange(144)*2.5
latitude = np.linspace(90,-90,73)
yy, xx = np.meshgrid(latitude,longitude,indexing='ij')
for name in ['uwnd','vwnd']:
    url = f'https://downloads.psl.noaa.gov/Datasets/ncep.reanalysis.derived/surface_gauss/{name}.10m.mon.ltm.1991-2020.nc'
    path = CACHE / (name+'.nc')
    if not path.exists():
        urllib.request.urlretrieve(url,path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if name in pinned and pinned[name]['sha256'] != digest:
        raise ValueError(f'Wind source checksum changed: {name}')
    with h5py.File(path) as grid:
        variable = grid[name]
        values = variable[:].astype(np.float64)*float(variable.attrs['scale_factor'][0])+float(variable.attrs['add_offset'][0])
        lat, lon = grid['lat'][:], grid['lon'][:]
        if values.shape != (12,94,192) or not np.all(np.isfinite(values)) or np.max(np.abs(values))>100:
            raise ValueError('Unexpected monthly wind grid.')
        monthly = []
        for month in range(12):
            wrapped = np.concatenate((values[month,::-1],values[month,::-1,:1]),axis=1)
            interpolate = RegularGridInterpolator((lat[::-1],np.r_[lon,360]),wrapped)
            points = np.stack((np.clip(yy,lat[-1],lat[0]),xx),axis=-1)
            monthly.append(interpolate(points))
        components.append(np.array(monthly))
        sources[name] = {'url':url,'sha256':digest,'name':grid.attrs['dataset_title'].decode(),'variable':variable.attrs['long_name'].decode(),'period':grid['time'].attrs['climo_period'].decode()}
# Screen y increases southward; NOAA's v component increases northward.
values = np.stack((components[0],-components[1]),axis=-1)
encoded = np.clip(np.rint(values/.25),-127,127).astype(np.int8).tobytes()
asset_path = ROOT / 'assets/world-winds.js'
asset_path.write_text('export const windWidth=144,windHeight=73,windCell=12.5,windUnit=.25;\nexport const windVectors="'+base64.b64encode(encoded).decode()+'";\n')
manifest = {'sources':sources,'documentation':'https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.html',
            'acknowledgement':'NCEP/NCAR Reanalysis 1 data provided by NOAA PSL, Boulder, Colorado, USA, https://psl.noaa.gov',
            'raster':[144,73],'months':12,'degreesPerCell':2.5,'worldUnitsPerCell':12.5,'longitudeOrigin':0,'latitudeOrigin':90,
            'encoding':'Month, latitude, longitude, component. Signed int8 eastward and southward vectors in 0.25 m/s steps.',
            'assetSha256':hashlib.sha256(asset_path.read_bytes()).hexdigest(),
            'adaptations':['Bilinear resampling from the Gaussian source grid with longitude wrapping and nearest pole values.',
                           'Monthly vector means describe broad prevailing patterns, not individual storms or historical weather in 1522.',
                           'The game adds seeded smooth weather variation and an abstract sailing-speed response.']}
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print('Wind vector bytes:',len(encoded),'Maximum quantization error m/s:',float(np.max(np.abs(np.frombuffer(encoded,dtype=np.int8).reshape(values.shape)*.25-values))))
