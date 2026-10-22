# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "moge @ git+https://github.com/microsoft/MoGe.git@07444410f1e33f402353b99d6ccd26bd31e469e8",
#   "numpy>=2",
#   "pillow>=11",
#   "torch>=2.4",
# ]
# ///
"""Turn one image into Floravenge's two assets: its colours and the depth of every pixel.

Usage: uv run scripts/forest-depth.py <image> [--width 1376]

MoGe-2 (https://github.com/microsoft/MoGe, pinned to the last MoGe-2 commit before the MoGe-3
rewrite; MIT code and weights) estimates a metric depth for each pixel. The image is scaled to
--width first, and photo.ts draws about one grain per pixel of that, so the width sets the detail.
It runs on Apple GPUs when PyTorch can see one, and takes several minutes on a CPU.

Writes src/lib/particles/forest/alley.jpg and alley.depth. The .depth file is zlib-deflated.
Inside: a 28-byte header (u32 width, u32 height, u32 levels, f32 fx, f32 fy, f32 near, f32 far; fx
and fy normalised by width and height, principal point at the centre), then one code per pixel,
row by row from the top: 0 where MoGe masked the pixel out, otherwise 1 to levels, log-spaced from
near to far. Codes are stored as i16 differences along each row, which deflate packs far better
than the codes themselves.
"""

import argparse
import struct
import zlib
from pathlib import Path

import numpy as np
import torch
from moge.model.v2 import MoGeModel
from PIL import Image, ImageOps

OUT = Path(__file__).resolve().parent.parent / "src/lib/particles/forest"
# Ten bits is a step of 0.25% in depth: about a centimetre at 5 m, far below what the camera's
# drift can show, and it keeps the file inside the repository's 500 KB limit.
LEVELS = 1023

parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
parser.add_argument("image", type=Path)
parser.add_argument("--width", type=int, default=1376)
args = parser.parse_args()

# Phone photos store their rotation separately; apply it, or the alley comes out on its side.
image = ImageOps.exif_transpose(Image.open(args.image)).convert("RGB")
width: int = args.width
height = round(image.height * width / image.width)
pixels = np.asarray(image.resize((width, height), Image.Resampling.LANCZOS))

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
model = MoGeModel.from_pretrained("Ruicheng/moge-2-vitl-normal").to(device).eval()
tensor = torch.tensor(pixels / 255, dtype=torch.float32, device=device).permute(2, 0, 1)
with torch.inference_mode():
    result = model.infer(tensor, resolution_level=9)
depth: np.ndarray = result["depth"].cpu().numpy()
mask: np.ndarray = result["mask"].cpu().numpy()
intrinsics: np.ndarray = result["intrinsics"].cpu().numpy()

fx, fy, cx, cy = intrinsics[0, 0], intrinsics[1, 1], intrinsics[0, 2], intrinsics[1, 2]
# photo.ts puts the principal point at the centre; MoGe-2 does too.
assert abs(cx - 0.5) < 1e-3 and abs(cy - 0.5) < 1e-3, (cx, cy)

# Rounded down to 10 cm, but never to zero, or every code would be log(0).
near = max(0.1, float(np.floor(depth[mask].min() * 10) / 10))
far = float(np.ceil(depth[mask].max()))
code = np.log(np.where(mask, depth, near) / near) / np.log(far / near)
levels = np.clip(np.round(1 + code * (LEVELS - 1)), 1, LEVELS)
quantized = np.where(mask, levels, 0).astype(np.int32)
deltas = np.diff(quantized, axis=1, prepend=0).astype("<i2")
header = struct.pack("<IIIffff", width, height, LEVELS, fx, fy, near, far)
(OUT / "alley.depth").write_bytes(zlib.compress(header + deltas.tobytes(), 9))
Image.fromarray(pixels).save(OUT / "alley.jpg", quality=90, optimize=True, progressive=True)

print(f"{width}×{height}, fov {np.degrees(2 * np.arctan(0.5 / fx)):.1f}° across")
print(f"depth {near}–{far} m, median {np.median(depth[mask]):.2f} m, {1 - mask.mean():.1%} masked")
