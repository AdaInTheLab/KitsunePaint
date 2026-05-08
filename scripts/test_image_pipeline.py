"""
Test the build_bundle.py image pipeline against a battery of input shapes
and orientations. Surfaces three classes of bug we've seen reported:

  1. ASPECT distortion ~ non-square sources getting squashed by resize_to_512
  2. ORIENTATION drift  ~ EXIF Orientation tags on JPGs ignored
  3. (placeholder)      ~ "frame cut off" needs reporter clarification

For each fixture we:
  - Create a deterministic image with 4 colored corner-stripes:
        TOP=red   BOTTOM=blue   LEFT=green   RIGHT=yellow
  - Drop it into a temp Resources/ dir as <name>_diffuse.<ext>
  - Run scripts/build_bundle.py on it (same code path the web tool uses)
  - Re-open the resulting Atlas_001.unity3d via UnityPy
  - Pull the Texture2D back out as a PIL Image
  - Probe colors at top/bottom/left/right midpoints
  - Compare aspect-ratio (output_w/output_h) vs expected

Run:
    python scripts/test_image_pipeline.py

Exits non-zero if any fixture fails. Outputs go to scripts/_test_pipeline_output/
so a human can eyeball them too.
"""
from __future__ import annotations

import io
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw
import UnityPy

# Force UTF-8 stdout so the Unicode status glyphs render on Windows cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BUILD_BUNDLE = SCRIPT_DIR / "build_bundle.py"
TEMPLATE = SCRIPT_DIR / "Atlas.template.unity3d"
OUT_DIR = SCRIPT_DIR / "_test_pipeline_output"

# Colored edge stripes ~ pure RGB so float-rounding can't drift.
TOP_COLOR    = (255,   0,   0)  # red
BOTTOM_COLOR = (  0,   0, 255)  # blue
LEFT_COLOR   = (  0, 255,   0)  # green
RIGHT_COLOR  = (255, 255,   0)  # yellow
STRIPE_FRAC  = 0.10  # fraction of edge depth painted

# Distinct corner markers, drawn ON TOP of the stripes. Tests the third
# leg of the May-2026 v1.0.1 bug report: "the frame is not displaying
# correctly. Part of it is cut off." If pipeline truncation, mipmap
# rounding, or DXT block alignment ever cuts pixels off the edges, the
# corner markers go missing. 16 px squares survive DXT 4×4 block
# compression cleanly.
CORNER_TL = (255,   0, 255)  # magenta — top-left
CORNER_TR = (  0, 255, 255)  # cyan    — top-right
CORNER_BL = (255, 165,   0)  # orange  — bottom-left
CORNER_BR = (255, 255, 255)  # white   — bottom-right
CORNER_PX = 16

# How close a pixel must be to the expected color to count as a match.
COLOR_TOL = 32  # generous, since bundle compression is lossy


def make_landmark_image(w: int, h: int, exif_orientation: Optional[int] = None) -> Image.Image:
    """
    Build a w×h RGB image with 4 colored corner-stripes for orientation detection.
    If exif_orientation is set (1-8), encodes that EXIF tag and pre-rotates the
    raw pixels so the *displayed* top is still red after EXIF-aware decode.

    EXIF orientation values (per spec):
      1 = identity, 3 = 180°, 6 = 90° CW, 8 = 90° CCW (and mirrored variants 2/4/5/7)
    """
    img = Image.new("RGB", (w, h), (200, 200, 200))
    d = ImageDraw.Draw(img)
    sw = max(1, int(w * STRIPE_FRAC))
    sh = max(1, int(h * STRIPE_FRAC))
    d.rectangle([0, 0, w, sh], fill=TOP_COLOR)        # top
    d.rectangle([0, h - sh, w, h], fill=BOTTOM_COLOR) # bottom
    d.rectangle([0, 0, sw, h], fill=LEFT_COLOR)       # left
    d.rectangle([w - sw, 0, w, h], fill=RIGHT_COLOR)  # right

    # Corner markers ON TOP of edge stripes ~ proves no edge content gets
    # cut off by the pipeline. Each marker is CORNER_PX×CORNER_PX so DXT
    # 4×4 compression can't blur it away.
    cp = CORNER_PX
    d.rectangle([0,     0,     cp,    cp],    fill=CORNER_TL)
    d.rectangle([w - cp, 0,    w,     cp],    fill=CORNER_TR)
    d.rectangle([0,     h - cp, cp,   h],     fill=CORNER_BL)
    d.rectangle([w - cp, h - cp, w,   h],     fill=CORNER_BR)

    if exif_orientation is None or exif_orientation == 1:
        return img

    # Pre-transform the pixels so that when an EXIF-aware viewer applies
    # the inverse rotation per the orientation tag, the result has TOP=red.
    # We embed the orientation tag using PIL's getexif().
    if exif_orientation == 3:  # 180°
        img = img.rotate(180, expand=True)
    elif exif_orientation == 6:  # display = rotate 90° CW
        img = img.rotate(90, expand=True)  # so displayed CW gets back to upright
    elif exif_orientation == 8:  # display = rotate 90° CCW
        img = img.rotate(-90, expand=True)
    return img


def save_with_exif(img: Image.Image, path: Path, exif_orientation: int) -> None:
    """Save a JPG with the given EXIF Orientation tag."""
    exif = img.getexif()
    exif[274] = exif_orientation  # 274 = Orientation tag
    img.save(path, format="JPEG", exif=exif, quality=92)


# Color sample helpers ~ probe a small window at each edge midpoint.
def avg_color(img: Image.Image, box: tuple) -> tuple:
    crop = img.crop(box).convert("RGB")
    px = list(crop.getdata())
    n = len(px)
    return (sum(p[0] for p in px) // n, sum(p[1] for p in px) // n, sum(p[2] for p in px) // n)


def sample_edges(img: Image.Image) -> dict:
    w, h = img.size
    pad = max(2, w // 20)  # window radius
    cx, cy = w // 2, h // 2
    return {
        "top":    avg_color(img, (cx - pad, 0,           cx + pad, pad * 2)),
        "bottom": avg_color(img, (cx - pad, h - pad * 2, cx + pad, h)),
        "left":   avg_color(img, (0,           cy - pad, pad * 2, cy + pad)),
        "right":  avg_color(img, (w - pad * 2, cy - pad, w,        cy + pad)),
    }


def sample_corners(img: Image.Image) -> dict:
    """
    Probe each corner of the output. The window is sized so it stays well
    inside the corner marker even after resize from source dimensions to
    the bundle's TARGET_SIZE (512). For a 1024×1024 source with 16-px
    markers, after downscale to 512 the marker is 8 px ~ we sample the
    inner 4 px to dodge anti-aliasing along the marker's outer edge.
    """
    w, h = img.size
    win = 4  # tight inner window
    return {
        "top_left":     avg_color(img, (0,        0,        win,    win)),
        "top_right":    avg_color(img, (w - win,  0,        w,      win)),
        "bottom_left":  avg_color(img, (0,        h - win,  win,    h)),
        "bottom_right": avg_color(img, (w - win,  h - win,  w,      h)),
    }


def color_close(a: tuple, b: tuple, tol: int = COLOR_TOL) -> bool:
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def color_name(c: tuple) -> str:
    """Best-fit name for a sampled color (helps the report read clearly)."""
    candidates = {
        "RED":    TOP_COLOR,
        "BLUE":   BOTTOM_COLOR,
        "GREEN":  LEFT_COLOR,
        "YELLOW": RIGHT_COLOR,
        "GREY":   (200, 200, 200),
        "BLACK":  (0, 0, 0),
        "WHITE":  (255, 255, 255),
    }
    best, best_d = "?", 1e9
    for name, ref in candidates.items():
        d = sum(abs(c[i] - ref[i]) for i in range(3))
        if d < best_d:
            best, best_d = name, d
    return f"{best} {c}"


# ─── Pipeline runner ─────────────────────────────────────────────────────

def run_pipeline(fixture_path: Path) -> Image.Image:
    """
    Run a single fixture through build_bundle.py exactly the way the web
    tool does, then return the diffuse Texture2D back as a PIL Image.
    """
    with tempfile.TemporaryDirectory(prefix="ktp-test-") as tmp:
        tmp_dir = Path(tmp)
        # The bundle builder discovers paints by `<name>_diffuse.<ext>` filenames.
        ext = fixture_path.suffix
        target = tmp_dir / f"fixture_diffuse{ext}"
        shutil.copyfile(fixture_path, target)

        # Same invocation the Express server uses (--pack-id "" to skip namespacing).
        cmd = [
            sys.executable, "-X", "utf8", str(BUILD_BUNDLE),
            str(tmp_dir), str(TEMPLATE), "--pack-id", "",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            raise RuntimeError(
                f"build_bundle failed (rc={result.returncode}):\n"
                f"  stdout: {result.stdout}\n  stderr: {result.stderr}"
            )

        bundle_path = tmp_dir / "Atlas_001.unity3d"
        if not bundle_path.exists():
            raise RuntimeError(f"build_bundle produced no Atlas_001.unity3d. log:\n{result.stdout}")

        # Read bundle bytes into memory so UnityPy doesn't hold a file lock
        # past this scope ~ on Windows the lock prevents temp-dir cleanup.
        bundle_bytes = bundle_path.read_bytes()

    # NOTE: temp dir is gone by the time we exit the `with` ~ that's fine,
    # everything we need is in `bundle_bytes`.
    env = UnityPy.load(io.BytesIO(bundle_bytes))
    for obj in env.objects:
        if obj.type.name != "Texture2D":
            continue
        tex = obj.parse_as_object()
        name = getattr(tex, "m_Name", "")
        if "diffuse" in name.lower():
            return tex.image  # PIL.Image
    raise RuntimeError("No diffuse Texture2D found in built bundle")


# ─── Test cases ──────────────────────────────────────────────────────────

@dataclass
class Case:
    name: str
    width: int
    height: int
    fmt: str                          # "png" or "jpg"
    exif: Optional[int]               # EXIF orientation tag value, or None
    description: str
    expect_build_error: bool = False  # bundle compiler should refuse this fixture


CASES = [
    Case("square_512_png",  512, 512,   "png", None, "baseline 1:1 PNG"),
    Case("square_1024_png", 1024, 1024, "png", None, "1:1 PNG that requires downscale"),
    Case("square_256_png",  256, 256,   "png", None, "1:1 PNG that requires upscale"),
    Case("wide_2to1_png",   1024, 512,  "png", None, "2:1 wide PNG ~ should be rejected (use grid-split)", expect_build_error=True),
    Case("tall_1to2_png",   512, 1024,  "png", None, "1:2 tall PNG ~ should be rejected (use grid-split)", expect_build_error=True),
    Case("baseline_jpg",    1024, 1024, "jpg", None, "JPG with no EXIF orientation"),
    Case("jpg_exif_3",      1024, 1024, "jpg", 3,    "JPG with EXIF Orientation 3 (180°)"),
    Case("jpg_exif_6",      1024, 1024, "jpg", 6,    "JPG with EXIF Orientation 6 (90° CW)"),
    Case("jpg_exif_8",      1024, 1024, "jpg", 8,    "JPG with EXIF Orientation 8 (90° CCW)"),
]


def write_fixture(case: Case, dest: Path) -> Path:
    img = make_landmark_image(case.width, case.height, exif_orientation=case.exif)
    path = dest / f"{case.name}.{case.fmt}"
    if case.fmt == "jpg":
        if case.exif is not None:
            save_with_exif(img, path, case.exif)
        else:
            img.save(path, format="JPEG", quality=92)
    else:
        img.save(path, format="PNG")
    return path


# ─── Main ────────────────────────────────────────────────────────────────

def main() -> int:
    OUT_DIR.mkdir(exist_ok=True)
    fixtures_dir = OUT_DIR / "fixtures"
    fixtures_dir.mkdir(exist_ok=True)
    outputs_dir = OUT_DIR / "outputs"
    outputs_dir.mkdir(exist_ok=True)

    if not BUILD_BUNDLE.exists():
        print(f"ERROR: {BUILD_BUNDLE} not found")
        return 2
    if not TEMPLATE.exists():
        print(f"ERROR: {TEMPLATE} not found")
        return 2

    print(f"== KitsunePaint image pipeline test ==")
    print(f"  build_bundle.py : {BUILD_BUNDLE.relative_to(REPO_ROOT)}")
    print(f"  fixtures        : {fixtures_dir.relative_to(REPO_ROOT)}")
    print(f"  outputs         : {outputs_dir.relative_to(REPO_ROOT)}")
    print()

    failures: list[str] = []

    for case in CASES:
        print(f"-- {case.name}  ({case.description})")

        fixture_path = write_fixture(case, fixtures_dir)
        try:
            output = run_pipeline(fixture_path)
        except Exception as e:
            if case.expect_build_error:
                # Sanity-check the error message mentions the actual problem
                # so we don't accept a *different* failure as proof of fix.
                msg = str(e).lower()
                if "non-square" in msg or "aspect" in msg or "1:1" in msg:
                    print(f"   build refused as expected (non-square source)")
                    continue
                print(f"   ✗ build refused but for the wrong reason: {e}")
                failures.append(f"{case.name}: refused with unexpected error")
                continue
            print(f"   ✗ pipeline crashed: {e}")
            failures.append(f"{case.name}: pipeline crashed")
            continue

        if case.expect_build_error:
            print(f"   ✗ build SUCCEEDED but should have refused (non-square)")
            failures.append(f"{case.name}: should have been refused, was built")
            continue

        # Save output for human review
        output_path = outputs_dir / f"{case.name}_output.png"
        output.convert("RGBA").save(output_path)

        # === Aspect check ===
        in_aspect  = case.width / case.height
        # For EXIF-rotated 90/270 JPGs the *displayed* aspect is the inverse
        # of the stored aspect.
        if case.exif in (5, 6, 7, 8):
            in_aspect = case.height / case.width
        out_aspect = output.width / output.height
        aspect_ok = abs(in_aspect - out_aspect) < 0.05
        aspect_msg = f"src {in_aspect:.2f}:1 → out {out_aspect:.2f}:1"
        if aspect_ok:
            print(f"   aspect OK   : {aspect_msg}")
        else:
            print(f"   aspect FAIL : {aspect_msg}")
            failures.append(f"{case.name}: aspect {in_aspect:.2f} → {out_aspect:.2f}")

        # === Orientation check ===
        edges = sample_edges(output)
        ori_results = {
            "top":    color_close(edges["top"],    TOP_COLOR),
            "bottom": color_close(edges["bottom"], BOTTOM_COLOR),
            "left":   color_close(edges["left"],   LEFT_COLOR),
            "right":  color_close(edges["right"],  RIGHT_COLOR),
        }
        if all(ori_results.values()):
            print(f"   orient OK   : T=red B=blue L=green R=yellow")
        else:
            broken = [k for k, v in ori_results.items() if not v]
            details = " ".join(f"{k}={color_name(edges[k])}" for k in broken)
            print(f"   orient FAIL : {details}")
            failures.append(f"{case.name}: orientation broken on {','.join(broken)}")

        # === Corner-preservation check ("part of it is cut off") ===
        # Verifies that pixels at the absolute corners of the source still
        # map to the corner markers in the output. If the pipeline truncates
        # edges, downscales without preserving them, or the bundle compiler
        # crops to a sub-region, the marker color goes missing.
        corners = sample_corners(output)
        corner_expected = {
            "top_left":     CORNER_TL,
            "top_right":    CORNER_TR,
            "bottom_left":  CORNER_BL,
            "bottom_right": CORNER_BR,
        }
        corner_results = {
            k: color_close(corners[k], corner_expected[k]) for k in corner_expected
        }
        if all(corner_results.values()):
            print(f"   corners OK  : all 4 markers preserved")
        else:
            broken = [k for k, v in corner_results.items() if not v]
            details = " ".join(
                f"{k}={corners[k]} (want {corner_expected[k]})" for k in broken
            )
            print(f"   corners FAIL: {details}")
            failures.append(f"{case.name}: corner cut off at {','.join(broken)}")

    print()
    if failures:
        print(f"FAIL ~ {len(failures)} of {len(CASES)} cases failed:")
        for f in failures:
            print(f"   • {f}")
        print(f"\nFixtures + outputs left at {OUT_DIR.relative_to(REPO_ROOT)} for inspection.")
        return 1

    print(f"OK ~ all {len(CASES)} cases passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
