#!/usr/bin/env python3
"""Genera los cinco mapas provinciales de la Ruta Patagónica.

La geometría proviene de los GeoJSON departamentales de IGN/CONAE publicados
en mgaitan/departamentos_argentina. El render conserva el lenguaje visual de
los mapas existentes: silueta transparente, bordó texturado y límites dorados.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SIZE = 1254
SCALE = 3
CANVAS = SIZE * SCALE
PADDING = 34 * SCALE
GOLD = (225, 174, 45, 255)
GOLD_LIGHT = (246, 203, 79, 255)
BURGUNDY = np.array([105, 3, 28], dtype=np.float32)

PROVINCES = {
    "la-pampa": "departamentos-la_pampa.json",
    "neuquen": "departamentos-neuquen.json",
    "rio-negro": "departamentos-rio_negro.json",
    "chubut": "departamentos-chubut.json",
    "tierra-del-fuego": "departamentos-tierra_del_fuego.json",
}


def polygon_parts(geometry: dict) -> list[list[list[list[float]]]]:
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["coordinates"]
    raise ValueError(f"Geometría no soportada: {geometry['type']}")


def iter_points(features: list[dict]):
    for feature in features:
        for polygon in polygon_parts(feature["geometry"]):
            for ring in polygon:
                yield from ring


def make_transform(features: list[dict]):
    points = list(iter_points(features))
    mean_lat = sum(point[1] for point in points) / len(points)
    lon_scale = math.cos(math.radians(mean_lat))
    xs = [point[0] * lon_scale for point in points]
    ys = [-point[1] for point in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    scale = min(
        (CANVAS - 2 * PADDING) / (max_x - min_x),
        (CANVAS - 2 * PADDING) / (max_y - min_y),
    )
    offset_x = (CANVAS - (max_x - min_x) * scale) / 2
    offset_y = (CANVAS - (max_y - min_y) * scale) / 2

    def transform(point: list[float]) -> tuple[float, float]:
        return (
            offset_x + (point[0] * lon_scale - min_x) * scale,
            offset_y + (-point[1] - min_y) * scale,
        )

    return transform


def texture(mask: Image.Image, seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    small = rng.normal(0, 1, (CANVAS // 8 + 1, CANVAS // 8 + 1)).astype(np.float32)
    noise = Image.fromarray(np.uint8(np.clip((small + 3) * 42, 0, 255)))
    noise = noise.resize((CANVAS, CANVAS), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(10))
    grain = rng.normal(0, 5.5, (CANVAS, CANVAS, 1)).astype(np.float32)
    broad = (np.asarray(noise, dtype=np.float32)[..., None] - 126) * 0.12
    yy, xx = np.mgrid[0:CANVAS, 0:CANVAS]
    vignette = -13 * (((xx - CANVAS / 2) / CANVAS) ** 2 + ((yy - CANVAS / 2) / CANVAS) ** 2)[..., None]
    rgb = np.clip(BURGUNDY + broad + grain + vignette, 0, 255).astype(np.uint8)
    alpha = np.asarray(mask, dtype=np.uint8)[..., None]
    return Image.fromarray(np.concatenate([rgb, alpha], axis=2), "RGBA")


def render(slug: str, source: Path, output: Path) -> None:
    data = json.loads(source.read_text(encoding="utf-8"))
    features = data["features"]

    # La ficha provincial representa la Isla Grande y sus islas inmediatas;
    # Malvinas/Atlántico Sur ya tienen recuadros propios en el mapa nacional.
    if slug == "tierra-del-fuego":
        features = [f for f in features if f["properties"]["id"] in (287, 444)]

    transform = make_transform(features)
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    mask_draw = ImageDraw.Draw(mask)
    line_layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    line_draw = ImageDraw.Draw(line_layer)

    for feature in features:
        for polygon in polygon_parts(feature["geometry"]):
            exterior = [transform(point) for point in polygon[0]]
            mask_draw.polygon(exterior, fill=255)
            for hole in polygon[1:]:
                mask_draw.polygon([transform(point) for point in hole], fill=0)
            for ring in polygon:
                line_draw.line([transform(point) for point in ring], fill=GOLD, width=3 * SCALE, joint="curve")

    result = texture(mask, seed=sum(map(ord, slug)))
    result.alpha_composite(line_layer)

    # Contorno provincial más luminoso y levemente más ancho que los límites.
    expanded = mask.filter(ImageFilter.MaxFilter(4 * SCALE + 1))
    contracted = mask.filter(ImageFilter.MinFilter(2 * SCALE + 1))
    border = np.asarray(expanded, dtype=np.int16) - np.asarray(contracted, dtype=np.int16)
    border_mask = Image.fromarray(np.uint8(np.clip(border, 0, 255)))
    border_layer = Image.new("RGBA", (CANVAS, CANVAS), GOLD_LIGHT)
    border_layer.putalpha(border_mask)
    result.alpha_composite(border_layer)

    result = result.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    result.save(output, "WEBP", lossless=True, method=6)
    print(f"{slug}: {output}")


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    geodata = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo.parent / "departamentos_argentina"
    for slug, filename in PROVINCES.items():
        source = geodata / filename
        if not source.exists():
            raise FileNotFoundError(source)
        output = repo / "public" / "historia" / f"provincia-{slug}.webp"
        if output.exists():
            print(f"{slug}: ya existe, se conserva {output}")
            continue
        render(slug, source, output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
