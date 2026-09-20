"""Generate the committed wordmark from the app's real Comfortaa Bold font.

Run with Python 3 + fonttools: python scripts/generate-cicure-logo.py
Use --check to verify the committed geometry without changing any files.
No font parser or font file is loaded by the animation at runtime.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.perimeterPen import PerimeterPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps


ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = ROOT / "node_modules/@expo-google-fonts/comfortaa/700Bold/Comfortaa_700Bold.ttf"
OUTPUT_PATH = ROOT / "src/ui/brand/cicurePaths.ts"
WORD = "cicure"
SCALE = 0.1
PADDING = 3


def pair_values(font: TTFont, first: str, second: str):
    """Apply the font's GPOS pair kerning, including class-based pairs."""
    if "GPOS" not in font:
        return []
    gpos = font["GPOS"].table
    lookup_indices = {
        index
        for record in gpos.FeatureList.FeatureRecord
        if record.FeatureTag == "kern"
        for index in record.Feature.LookupListIndex
    }
    result = []
    for index in sorted(lookup_indices):
        lookup = gpos.LookupList.Lookup[index]
        for subtable in lookup.SubTable:
            lookup_type = lookup.LookupType
            if lookup_type == 9:
                lookup_type = subtable.ExtensionLookupType
                subtable = subtable.ExtSubTable
            if lookup_type != 2 or first not in subtable.Coverage.glyphs:
                continue
            if subtable.Format == 1:
                pairs = subtable.PairSet[subtable.Coverage.glyphs.index(first)]
                record = next((pair for pair in pairs.PairValueRecord if pair.SecondGlyph == second), None)
                if record is None:
                    continue
            elif subtable.Format == 2:
                class1 = subtable.ClassDef1.classDefs.get(first, 0)
                class2 = subtable.ClassDef2.classDefs.get(second, 0)
                record = subtable.Class1Record[class1].Class2Record[class2]
            else:
                raise ValueError(f"Unsupported kerning format: {subtable.Format}")
            result.append((record.Value1, record.Value2))
            break  # Only the first matching subtable of a lookup applies.
    return result


def positioned_glyphs(font: TTFont):
    cmap = font.getBestCmap()
    names = [cmap[ord(character)] for character in WORD]
    advances = [font["hmtx"].metrics[name][0] for name in names]
    placements = [0] * len(names)
    for index, (first, second) in enumerate(zip(names, names[1:])):
        for value1, value2 in pair_values(font, first, second):
            for offset, value in enumerate((value1, value2)):
                if value is not None:
                    advances[index + offset] += getattr(value, "XAdvance", 0)
                    placements[index + offset] += getattr(value, "XPlacement", 0)
                    if getattr(value, "YAdvance", 0) or getattr(value, "YPlacement", 0):
                        raise ValueError("The wordmark expects horizontal kerning only")
    cursor = 0
    result = []
    glyph_set = font.getGlyphSet()
    for character, name, advance, placement in zip(WORD, names, advances, placements):
        recording = DecomposingRecordingPen(glyph_set)
        glyph_set[name].draw(TransformPen(recording, (SCALE, 0, 0, -SCALE, (cursor + placement) * SCALE, 0)))
        result.append((character, recording))
        cursor += advance
    return result


def svg_path(recording: RecordingPen) -> str:
    pen = SVGPathPen(None, ntos=lambda value: format(round(value, 4), "g"))
    recording.replay(pen)
    return pen.getCommands()


def generate() -> str:
    font = TTFont(FONT_PATH)
    removeOverlaps(font)
    glyphs = positioned_glyphs(font)
    bounds = BoundsPen(None)
    for _, recording in glyphs:
        recording.replay(bounds)
    x_min, y_min, x_max, y_max = bounds.bounds
    width = round(x_max - x_min + PADDING * 2, 4)
    height = round(y_max - y_min + PADDING * 2, 4)
    letters = []
    for character, recording in glyphs:
        normalized = RecordingPen()
        recording.replay(TransformPen(normalized, (1, 0, 0, 1, PADDING - x_min, PADDING - y_min)))
        contour_recordings = []
        current = RecordingPen()
        for operation, arguments in normalized.value:
            if operation == "moveTo" and current.value:
                contour_recordings.append(current)
                current = RecordingPen()
            current.value.append((operation, arguments))
        if current.value:
            contour_recordings.append(current)
        contours = []
        for contour in contour_recordings:
            perimeter = PerimeterPen(None, tolerance=0.00001)
            contour.replay(perimeter)
            assert perimeter.value > 0
            contours.append({"d": svg_path(contour), "length": round(perimeter.value, 4)})
        # Draw the main body before disconnected dots or overlapping stems.
        contours.sort(key=lambda contour: contour["length"], reverse=True)
        total_length = sum(contour["length"] for contour in contours)
        cursor = 0
        for contour in contours:
            contour["start"] = round(cursor / total_length, 8)
            contour["duration"] = round(contour["length"] / total_length, 8)
            cursor += contour["length"]
        letters.append({"letter": character, "d": svg_path(normalized), "contours": contours})
    assert "".join(letter["letter"] for letter in letters) == WORD
    # Comfortaa uses overlapping components in glyphs such as u and r;
    # removeOverlaps merges them into clean, non-intersecting stroke contours.
    assert len(letters[1]["contours"]) == 2, "The i dot must be preserved"
    assert len(letters[3]["contours"]) == 1, "The u must have a clean unified contour without overlaps"
    assert len(letters[4]["contours"]) == 1, "The r must have a clean unified contour without overlaps"
    assert len(letters[5]["contours"]) == 2, "The e outer and counter outlines must be preserved"
    data = json.dumps({"width": width, "height": height, "letters": letters}, indent=2)
    digest = hashlib.sha256(FONT_PATH.read_bytes()).hexdigest()
    return (
        "// Generated by scripts/generate-cicure-logo.py. Do not hand-edit geometry.\n"
        "// Source: @expo-google-fonts/comfortaa/700Bold/Comfortaa_700Bold.ttf\n"
        f"// Source SHA-256: {digest}\n"
        "// Copyright 2011 The Comfortaa Project Authors; SIL OFL 1.1.\n"
        "// Coordinates retain the font outlines, advance widths and GPOS kerning.\n"
        f"export const cicurePaths = {data} as const;\n"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated = generate()
    if args.check:
        if OUTPUT_PATH.read_text(encoding="utf-8") != generated:
            raise SystemExit("Wordmark geometry differs. Run python scripts/generate-cicure-logo.py")
        print("Comfortaa Bold geometry, kerning, contours and lengths match the source font.")
    else:
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(generated, encoding="utf-8", newline="\n")
        print(f"Generated {OUTPUT_PATH.relative_to(ROOT)}")
