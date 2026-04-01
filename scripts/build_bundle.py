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

DEFAULT_SPECULAR_COLOR = (16, 200, 0, 235)
# DXTnm neutral normal: R=255 (always), G=128 (neutral Y), B=0 (unused), A=128 (neutral X)
DEFAULT_NORMAL_COLOR = (255, 128, 0, 128)

FMT_DXT1 = 10
FMT_DXT5 = 12
MIP_COUNT = 10  # generate proper mipmaps


def resize_to_512(img: Image.Image) -> Image.Image:
    if img.size != TARGET_SIZE:
        print(f"  Resizing from {img.size} to {TARGET_SIZE}")
        img = img.resize(TARGET_SIZE, Image.LANCZOS)
    return img.convert("RGBA")


def inject_texture(tex_data, img: Image.Image, name: str):
    """Inject image with proper mipmaps."""
    tex_data.set_image(img, mipmap_count=MIP_COUNT)
    tex_data.m_Name = name
    tex_data.save()


def collect_paint_files(resources_dir: Path) -> dict:
    paint_files: dict[str, dict[str, Path]] = {}
    for f in sorted(resources_dir.glob("*")):
        if f.suffix.lower() not in (".png", ".jpg", ".jpeg"):
            continue
        stem = f.stem.lower()
        if stem.endswith("_diffuse"):
            paint_files.setdefault(stem[:-8], {})["diffuse"] = f
        elif stem.endswith("_normal"):
            paint_files.setdefault(stem[:-7], {})["normal"] = f
        elif stem.endswith("_specular"):
            paint_files.setdefault(stem[:-9], {})["specular"] = f
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

    ab_object = next(obj for obj in env.objects if obj.type.name == "AssetBundle")
    ab_data = ab_object.parse_as_object()
    container_entries = list(ab_data.m_Container)
    tex_by_pathid = {obj.path_id: obj for obj in env.objects if obj.type.name == "Texture2D"}

    # Separate slots by format
    fmt12_slots = []
    diffuse_slots = []
    for i, (path, info) in enumerate(container_entries):
        path_id = info.asset.m_PathID
        tex = tex_by_pathid[path_id].parse_as_object()
        fmt = int(tex.m_TextureFormat)
        if fmt == FMT_DXT1:
            diffuse_slots.append((i, path, info, path_id))
        else:
            fmt12_slots.append((i, path, info, path_id))

    specular_slots = [fmt12_slots[-1]] if fmt12_slots else []
    normal_slots = fmt12_slots[:-1] if len(fmt12_slots) > 1 else []

    print(f"Template: {len(diffuse_slots)} diffuse, {len(normal_slots)} normal, {len(specular_slots)} specular slots")

    paint_names = list(paint_files.keys())
    if len(paint_names) > len(diffuse_slots):
        print(f"WARN: truncating to {len(diffuse_slots)} paints")
        paint_names = paint_names[:len(diffuse_slots)]

    new_container = []

    # Diffuses into DXT1 slots with proper mipmaps
    for j, paint_name in enumerate(paint_names):
        slot_i, old_path, asset_info, path_id = diffuse_slots[j]
        files = paint_files[paint_name]
        img = resize_to_512(Image.open(files["diffuse"] if "diffuse" in files else next(iter(files.values()))))
        new_path = f"assets/{paint_name}_diffuse.png"
        tex_data = tex_by_pathid[path_id].parse_as_object()
        inject_texture(tex_data, img, f"{paint_name}_diffuse")
        new_container.append((slot_i, new_path, asset_info))
        print(f"  Diffuse [{slot_i}] (mips={tex_data.m_MipCount}): -> {new_path}")

    # DXTnm neutral normal with proper mipmaps
    if normal_slots:
        slot_i, old_path, asset_info, path_id = normal_slots[0]
        normal_img = Image.new("RGBA", TARGET_SIZE, DEFAULT_NORMAL_COLOR)
        tex_data = tex_by_pathid[path_id].parse_as_object()
        inject_texture(tex_data, normal_img, "default_normal")
        new_container.append((slot_i, "assets/default_normal.png", asset_info))
        print(f"  Normal [{slot_i}] (mips={tex_data.m_MipCount}): -> assets/default_normal.png")

    # Specular with proper mipmaps
    if specular_slots:
        slot_i, old_path, asset_info, path_id = specular_slots[0]
        spec_img = Image.new("RGBA", TARGET_SIZE, DEFAULT_SPECULAR_COLOR)
        tex_data = tex_by_pathid[path_id].parse_as_object()
        inject_texture(tex_data, spec_img, "default_specular")
        new_container.append((slot_i, "assets/default_specular.png", asset_info))
        print(f"  Specular [{slot_i}] (mips={tex_data.m_MipCount}): -> assets/default_specular.png")

    new_container.sort(key=lambda x: x[0])
    ab_data.m_Container = [(path, info) for _, path, info in new_container]
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
        sys.exit(1)

    print(f"KitsunePaint Bundle Builder 🦊")
    print(f"Resources: {resources_dir}")
    print(f"Template:  {template_path}")

    build_bundle(resources_dir, template_path)
    print("\n✅ Bundle ready! Restart your server and client.")


if __name__ == "__main__":
    main()
