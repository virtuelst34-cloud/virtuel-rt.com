#!/usr/bin/env python3
"""Create a deployment zip with correct Unix permissions (755 dirs, 644 files)."""

import os
import stat
import sys
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXCLUDE_DIRS = {"node_modules"}
EXCLUDE_FILES = {".env.local"}


def unix_mode_for(path: Path, is_dir: bool) -> int:
    if is_dir:
        return stat.S_IFDIR | 0o755
    if path.suffix == ".sh":
        return stat.S_IFREG | 0o755
    return stat.S_IFREG | 0o644


def add_entry(zf: zipfile.ZipFile, path: Path, arcname: str, is_dir: bool) -> None:
    info = zipfile.ZipInfo(arcname)
    info.external_attr = unix_mode_for(path, is_dir) << 16
    zf.writestr(info, b"" if is_dir else path.read_bytes())


def create_zip(output: Path) -> None:
    added: set[str] = set()

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            current = Path(dirpath)
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]

            for dirname in sorted(dirnames):
                dir_path = current / dirname
                arcname = dir_path.relative_to(ROOT).as_posix() + "/"
                if arcname not in added:
                    add_entry(zf, dir_path, arcname, is_dir=True)
                    added.add(arcname)

            for filename in sorted(filenames):
                file_path = current / filename
                if filename in EXCLUDE_FILES:
                    continue
                if file_path.resolve() == output.resolve():
                    continue
                arcname = file_path.relative_to(ROOT).as_posix()
                if arcname in added:
                    continue
                add_entry(zf, file_path, arcname, is_dir=False)
                added.add(arcname)


def main() -> int:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output = ROOT.parent / f"virtuel-rt-complet-{timestamp}.zip"
    create_zip(output)
    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"Archive creee : {output}")
    print(f"Taille : {size_mb:.2f} Mo")
    print("Exclusions : node_modules, .env.local")
    print("Permissions : repertoires 755, fichiers 644")
    return 0


if __name__ == "__main__":
    sys.exit(main())
