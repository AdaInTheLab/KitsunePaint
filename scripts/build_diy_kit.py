"""
Regenerate public/KitsunePaint-DIY-Kit.zip

The kit ships build_bundle.py + Atlas.template.unity3d + README so users
can run the same Unity bundle compiler locally without hitting the
rate-limited web API. We assemble it from sources rather than committing
duplicated files.

Usage:
    python scripts/build_diy_kit.py

Cross-platform; only depends on stdlib zipfile.
"""
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
OUT_PATH = REPO_ROOT / "public" / "KitsunePaint-DIY-Kit.zip"

KIT_NAME = "KitsunePaint-DIY-Kit"

# (source path, name inside the zip)
KIT_FILES = [
    (SCRIPT_DIR / "build_bundle.py", f"{KIT_NAME}/build_bundle.py"),
    (SCRIPT_DIR / "Atlas.template.unity3d", f"{KIT_NAME}/Atlas.template.unity3d"),
    (SCRIPT_DIR / "diy_kit" / "README.md", f"{KIT_NAME}/README.md"),
]


def main() -> None:
    for src, _ in KIT_FILES:
        if not src.exists():
            raise SystemExit(f"missing source: {src}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if OUT_PATH.exists():
        OUT_PATH.unlink()

    with zipfile.ZipFile(OUT_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for src, arcname in KIT_FILES:
            zf.write(src, arcname=arcname)

    size_kb = OUT_PATH.stat().st_size // 1024
    print(f"Wrote {OUT_PATH} ({size_kb} KB)")
    with zipfile.ZipFile(OUT_PATH, "r") as zf:
        for info in zf.infolist():
            print(f"  {info.filename}  ({info.file_size:,} bytes)")


if __name__ == "__main__":
    main()
