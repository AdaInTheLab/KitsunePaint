"""
Inspect the OCB demo Atlas.unity3d to understand its structure.
Run: python scripts/inspect_bundle.py
"""

import UnityPy

BUNDLE_PATH = r"C:\Users\darab\Downloads\OcbCustomTexturesPaints\Resources\Atlas.unity3d"

env = UnityPy.load(BUNDLE_PATH)

print(f"All objects in bundle:")
print(f"{'Type':<30} {'Name':<50} {'Path ID'}")
print("-" * 90)

for obj in env.objects:
    try:
        data = obj.parse_as_object()
        name = getattr(data, 'm_Name', '[no name]')
        print(f"{obj.type.name:<30} {name:<50} {obj.path_id}")
    except Exception as e:
        print(f"{obj.type.name:<30} [parse error: {e}]")

print(f"\nContainer paths:")
for path, obj in env.container.items():
    print(f"  {path}")
