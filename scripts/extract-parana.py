# /// script
# dependencies = ["pyshp==3.0.3"]
# ///
"""Extract the connected lower Iguazu–Parana route from HydroRIVERS."""
from pathlib import Path
import hashlib
import io
import json
import urllib.request
import zipfile
import shapefile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tmp/geography/HydroRIVERS_v10_sa_shp.zip'
OUTPUT = ROOT / 'geography/parana-iguazu.geojson'
URL = 'https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_sa_shp.zip'
# Start below the cataracts; downstream links exclude the river above the falls.
FIRST_REACH, BASIN = 61387865, 61504467

if not CACHE.exists():
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(URL, CACHE)
digest = hashlib.sha256(CACHE.read_bytes()).hexdigest()
if OUTPUT.exists() and json.loads(OUTPUT.read_text())['source']['sha256'] != digest:
    raise ValueError('HydroRIVERS source checksum changed.')
archive = zipfile.ZipFile(CACHE)
base = next(name[:-4] for name in archive.namelist() if name.endswith('.shp'))
reader = shapefile.Reader(**{extension:io.BytesIO(archive.read(base+'.'+extension)) for extension in ['shp','shx','dbf']})
indices = {record['HYRIV_ID']:index for index,record in enumerate(reader.iterRecords(fields=['HYRIV_ID','MAIN_RIV'])) if record['MAIN_RIV'] == BASIN}
reaches, points = [], []
reach = FIRST_REACH
while reach:
    if reach in reaches:
        raise ValueError('Cycle in downstream river topology.')
    index = indices[reach]
    record = reader.record(index).as_dict()
    segment = [[round(lon,6),round(lat,6)] for lon,lat in reader.shape(index).points]
    if points and segment[0] != points[-1]:
        raise ValueError(f'Disconnected river reaches: {reaches[-1]} and {reach}')
    points.extend(segment[1:] if points else segment)
    reaches.append(reach)
    reach = record['NEXT_DOWN']

source = {'name':'HydroRIVERS v1.0, South America','url':URL,'documentation':'https://www.hydrosheds.org/products/hydrorivers','sha256':digest,'citation':'Lehner, B., Grill G. (2013): Global river hydrography and network routing: baseline data and new approaches to study the world’s large river systems. Hydrological Processes, 27(15): 2171–2186.','license':'https://www.hydrosheds.org/terms-of-use'}
feature = {'type':'Feature','properties':{'name':'Lower Iguazu and Parana','firstReach':FIRST_REACH,'mainRiver':BASIN,'reachIds':reaches,'widthCells':3},'geometry':{'type':'LineString','coordinates':points}}
OUTPUT.write_text(json.dumps({'type':'FeatureCollection','source':source,'features':[feature]},separators=(',',':'))+'\n')
print(f'{len(reaches)} connected reaches, {len(points)} points, {points[0]} to {points[-1]}')
