"""
KitsunePaint Bundle Builder
============================
Takes user PNG textures from a modlet's Resources/ folder and
injects them into a template Atlas.unity3d bundle using UnityPy.

No Unity installation required.

Usage:
    python scripts/build_bundle.py <modlet_resources_dir> [template_bundle]

Example:
    python scripts/build_bundle.py "F:/72D2D-Server/Mods/cat/Resources"

Requirements:
    pip install UnityPy Pillow
"""

import sys
from pathlib import Path
from PIL import Image
import UnityPy

SCRIPT_DIR = Path(__file__).parent
DEFAULT_TEMPLATE = SCRIPT_DIR / "Atlas.template.unity3d"
TARGET_SIZE = (512, 512)


def resize_to_512(img: Image.Image) -> Image.Image:
    if img.size != TARGET_SIZE:
        print(f"  Resizing from {img.size} to {TARGET_SIZE}")
        img = img.resize(TARGET_SIZE, Image.LANCZOS)
    return img.convert("RGBA")


def collect_paint_files(resources_dir: Path) -> dict:
    paint_files: dict[str, dict[str, Path]] = {}
    for f in sorted(resources_dir.glob("*")):
        if f.suffix.lower() not in (".png", ".jpg", ".jpeg"):
            continue
        stem = f.stem.lower()
        if stem.endswith("_diffuse"):
            name = stem[:-8]
            paint_files.setdefault(name, {})["diffuse"] = f
        elif stem.endswith("_normal"):
            name = stem[:-7]
            paint_files.setdefault(name, {})["normal"] = f
        elif stem.endswith("_specular"):
            name = stem[:-9]
            paint_files.setdefault(name, {})["specular"] = f
        else:
            paint_files.setdefault(stem, {})["diffuse"] = f
    return paint_files


def build_bundle(resources_dir: Path, template_path: Path) -> Path:
    paint_files = collect_paint_files(resources_dir)

    if not paint_files:
        print(f"ERROR: No PNG/JPG files found in {resources_dir}")
        sys.exit(1)

    print(f"\nPaint entries detected: {list(paint_files.keys())}")
    print(f"Loading template bundle...")
    env = UnityPy.load(str(template_path))

    texture_objects = [obj for obj in env.objects if obj.type.name == "Texture2D"]
    ab_object = next(obj for obj in env.objects if obj.type.name == "AssetBundle")
    ab_data = ab_object.parse_as_object()
    old_container = list(ab_data.m_Container)

    print(f"Template has {len(texture_objects)} slots, we need {len(paint_files)}")

    slots: list[tuple[str, Image.Image]] = []
    for paint_name, files in paint_files.items():
        asset_path = f"assets/{paint_name}_diffuse.png"
        if "diffuse" in files:
            img = resize_to_512(Image.open(files["diffuse"]))
            print(f"  {asset_path} <- {files['diffuse'].name}")
        else:
            first = next(iter(files.values()))
            img = resize_to_512(Image.open(first))
            print(f"  {asset_path} <- {first.name}")
        slots.append((asset_path, img))

    if len(slots) > len(texture_objects):
        print(f"\nWARN: {len(slots)} paints but only {len(texture_objects)} slots in template.")
        slots = slots[:len(texture_objects)]

    new_container = []
    for i, tex_obj in enumerate(texture_objects):
        tex_data = tex_obj.parse_as_object()
        if i < len(slots):
            asset_path, img = slots[i]
            paint_name = asset_path.split("/")[1].replace("_diffuse.png", "")

            tex_data.image = img
            tex_data.m_Name = paint_name + "_diffuse"
            # Be honest - we only have 1 mip level, not 10
            # Claiming 10 causes glitchy artifacts in game
            tex_data.m_MipCount = 1
            tex_data.save()

            _, asset_info = old_container[i]
            new_container.append((asset_path, asset_info))
            print(f"  Slot {i}: -> {asset_path}")

    ab_data.m_Container = new_container
    ab_data.save()

    output_path = resources_dir / "Atlas.unity3d"
    print(f"\nSaving to {output_path}...")
    with open(output_path, "wb") as f:
        f.write(env.file.save())

    print(f"Done! ({output_path.stat().st_size / 1024:.1f} KB)")
    return output_path


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    resources_dir = Path(sys.argv[1])
    template_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_TEMPLATE

    if not resources_dir.exists():
        print(f"ERROR: Resources directory not found: {resources_dir}")
        sys.exit(1)

    if not template_path.exists():
        print(f"ERROR: Template not found: {template_path}")
        print(f"Copy OCBCustomTexturesPaints/Resources/Atlas.unity3d to {template_path}")
        sys.exit(1)

    print(f"KitsunePaint Bundle Builder 🦊")
    print(f"Resources: {resources_dir}")
    print(f"Template:  {template_path}")

    build_bundle(resources_dir, template_path)
    print("\n✅ Bundle ready! Restart your server and client.")


if __name__ == "__main__":
    main()
