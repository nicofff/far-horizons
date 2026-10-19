# /// script
# dependencies = ["fonttools"]
# ///
import json
import subprocess
import unicodedata
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

root = Path(__file__).resolve().parent.parent
result = subprocess.run(["node", "--input-type=module", "-e", "import {alphabet} from './pixel.js'; console.log(JSON.stringify(alphabet));"], cwd=root, check=True, capture_output=True, text=True)
alphabet = json.loads(result.stdout)
font = FontBuilder(800, isTTF=True)
order = [".notdef", "space"] + [f"uni{ord(c):04X}" for c in alphabet]
font.setupGlyphOrder(order)
mapping = {32: "space"}
glyphs, metrics = {}, {}
for name, rows in [(".notdef", []), ("space", [])] + [(f"uni{ord(c):04X}", rows) for c, rows in alphabet.items()]:
    pen = TTGlyphPen(None)
    for y, row in enumerate(rows):
        for x, bit in enumerate(row):
            if bit == "1":
                left, bottom = x * 100, 700 - y * 100
                pen.moveTo((left, bottom))
                pen.lineTo((left, bottom + 100))
                pen.lineTo((left + 100, bottom + 100))
                pen.lineTo((left + 100, bottom))
                pen.closePath()
    glyphs[name] = pen.glyph()
    metrics[name] = (600, 0)
for char in alphabet:
    mapping[ord(char)] = f"uni{ord(char):04X}"
    if char.isalpha():
        mapping[ord(char.lower())] = mapping[ord(char)]
# Match the canvas renderer's accent folding instead of mixing in a fallback font.
for codepoint in range(0x00C0, 0x0180):
    base = "".join(char for char in unicodedata.normalize("NFD", chr(codepoint)) if not unicodedata.combining(char)).upper()
    if len(base) == 1 and base in alphabet:
        mapping[codepoint] = mapping[ord(base)]
font.setupCharacterMap(mapping)
font.setupGlyf(glyphs)
font.setupHorizontalMetrics(metrics)
font.setupHorizontalHeader(ascent=800, descent=-100)
font.setupNameTable({"familyName": "Far Horizons Pixel", "styleName": "Regular", "uniqueFontIdentifier": "FarHorizonsPixel-1", "fullName": "Far Horizons Pixel", "psName": "FarHorizonsPixel"})
font.setupOS2(sTypoAscender=800, sTypoDescender=-100, usWinAscent=800, usWinDescent=100)
font.setupPost()
font.setupMaxp()
output = root / "assets" / "far-horizons.ttf"
output.parent.mkdir(exist_ok=True)
font.save(output)
print(output)
