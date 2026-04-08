"""
KitsunePaint Bundle Builder
============================
Takes user PNG textures from a modlet's Resources/ folder and
injects them into Atlas.unity3d bundles using UnityPy.

Generates one bundle per paint for unlimited scalability.
No Unity installation required.

Usage:
    python scripts/build_bundle.py <modlet_resources_dir> [template_bundle]

Example:
    python scripts/build_bundle.py "F:/72D2D-Server/Mods/my_pack/Resources"

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

DEFAULT_NORMAL_COLOR = (255, 128, 0, 128)
DEFAULT_SPECULAR_COLOR = (16, 200, 0, 235)

FMT_DXT1 = 10
FMT_DXT5 = 12
MIP_COUNT = 8


def resize_to_512(img: Image.Image) -> Image.Image:
    if img.size != TARGET_SIZE:
        print(f"    Resizing from {img.size} to {TARGET_SIZE}")
        img = img.resize(TARGET_SIZE, Image.LANCZOS)
    return img.convert("RGBA")


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
    return {k: v for k, v in paint_files.items() if "diffuse" in v}


def rename_cab(bundle, paint_name: str) -> None:
    """Give each bundle a unique internal CAB name to avoid Unity conflicts."""
    cab_name = f"CAB-{paint_name}"
    ress_name = f"CAB-{paint_name}.resS"
    old_files = dict(bundle.files)
    bundle.files.clear()
    for key, val in old_files.items():
        if key.endswith(".resS"):
            bundle.files[ress_name] = val
        else:
            if hasattr(val, 'name'):
                val.name = cab_name
            bundle.files[cab_name] = val


def build_single_bundle(
    paint_name: str,
    diffuse: Image.Image,
    normal: Image.Image,
    specular: Image.Image,
    template_path: Path,
    output_path: Path,
) -> None:
    env = UnityPy.load(str(template_path))
    bundle = env.file

    rename_cab(bundle, paint_name)

    ab_object = next(obj for obj in env.objects if obj.type.name == "AssetBundle")
    ab_data = ab_object.parse_as_object()
    container_entries = list(ab_data.m_Container)
    tex_by_pathid = {obj.path_id: obj for obj in env.objects if obj.type.name == "Texture2D"}

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

    new_container = []

    if diffuse_slots:
        slot_i, _, asset_info, path_id = diffuse_slots[0]
        tex_data = tex_by_pathid[path_id].parse_as_object()
        tex_data.set_image(diffuse, mipmap_count=MIP_COUNT)
        tex_data.m_Name = f"{paint_name}_diffuse"
        tex_data.save()
        new_container.append((slot_i, f"assets/{paint_name}_diffuse.png", asset_info))

    if normal_slots:
        slot_i, _, asset_info, path_id = normal_slots[0]
        tex_data = tex_by_pathid[path_id].parse_as_object()
        tex_data.set_image(normal, mipmap_count=MIP_COUNT)
        tex_data.m_Name = f"{paint_name}_normal"
        tex_data.save()
        new_container.append((slot_i, f"assets/{paint_name}_normal.png", asset_info))

    if specular_slots:
        slot_i, _, asset_info, path_id = specular_slots[0]
        tex_data = tex_by_pathid[path_id].parse_as_object()
        tex_data.set_image(specular, mipmap_count=MIP_COUNT)
        tex_data.m_Name = f"{paint_name}_specular"
        tex_data.save()
        new_container.append((slot_i, f"assets/{paint_name}_specular.png", asset_info))

    new_container.sort(key=lambda x: x[0])
    ab_data.m_Container = [(path, info) for _, path, info in new_container]

    # Prune preload table to only our 3 textures - removes leftover template entries
    container_pathids = {info.asset.m_PathID for _, info in ab_data.m_Container}
    ab_data.m_PreloadTable = [p for p in ab_data.m_PreloadTable if p.m_PathID in container_pathids]

    ab_data.save()

    with open(output_path, "wb") as f:
        f.write(bundle.save())


def build_bundles(resources_dir: Path, template_path: Path) -> None:
    paint_files = collect_paint_files(resources_dir)

    if not paint_files:
        print(f"ERROR: No diffuse textures found in {resources_dir}")
        sys.exit(1)

    print(f"\nFound {len(paint_files)} paint(s): {list(paint_files.keys())}")

    neutral_normal = Image.new("RGBA", TARGET_SIZE, DEFAULT_NORMAL_COLOR)
    default_specular = Image.new("RGBA", TARGET_SIZE, DEFAULT_SPECULAR_COLOR)

    for old in resources_dir.glob("Atlas_*.unity3d"):
        old.unlink()
    old_single = resources_dir / "Atlas.unity3d"
    if old_single.exists():
        old_single.unlink()

    for i, (paint_name, files) in enumerate(paint_files.items(), 1):
        bundle_name = f"Atlas_{i:03d}.unity3d"
        output_path = resources_dir / bundle_name

        print(f"\n  [{i}/{len(paint_files)}] {paint_name} -> {bundle_name}")

        diffuse_img = resize_to_512(Image.open(files["diffuse"]))
        print(f"    diffuse:  {files['diffuse'].name}")

        if "normal" in files:
            normal_img = resize_to_512(Image.open(files["normal"]))
            print(f"    normal:   {files['normal'].name}")
        else:
            normal_img = neutral_normal.copy()
            print(f"    normal:   [default neutral]")

        if "specular" in files:
            specular_img = resize_to_512(Image.open(files["specular"]))
            print(f"    specular: {files['specular'].name}")
        else:
            specular_img = default_specular.copy()
            print(f"    specular: [default]")

        build_single_bundle(
            paint_name=paint_name,
            diffuse=diffuse_img,
            normal=normal_img,
            specular=specular_img,
            template_path=template_path,
            output_path=output_path,
        )

        size_kb = output_path.stat().st_size / 1024
        print(f"    saved {bundle_name} ({size_kb:.0f} KB)")

    print(f"\n✅ Built {len(paint_files)} bundle(s) in {resources_dir}")


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

    build_bundles(resources_dir, template_path)
    print("\nRestart your server and client to see the new paints!")


if __name__ == "__main__":
    main()
