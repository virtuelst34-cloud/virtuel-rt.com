#!/usr/bin/env python3
"""Build a Hostinger-ready SOURCE zip with Unix permissions (755 dirs, 644 files)."""
from __future__ import annotations

import json
import stat
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

INCLUDE_DIRS = ["src", "public"]
INCLUDE_FILES = [
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "index.html",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tailwind.config.js",
    "postcss.config.js",
    "components.json",
    ".env.example",
    "validate-env.js",
]
EXCLUDE_DIRS = {"node_modules", ".git", "coverage", "dist", "__pycache__", ".husky", ".temp"}
EXCLUDE_SUFFIXES = {".bak"}
EXCLUDE_NAMES = {".env.local", ".env"}


def unix_mode(path: Path, is_dir: bool) -> int:
    if is_dir:
        return stat.S_IFDIR | 0o755
    if path.suffix == ".sh":
        return stat.S_IFREG | 0o755
    return stat.S_IFREG | 0o644


def add_dir(zf: zipfile.ZipFile, arcname: str) -> None:
    name = arcname if arcname.endswith("/") else f"{arcname}/"
    info = zipfile.ZipInfo(name)
    info.external_attr = unix_mode(Path(name), is_dir=True) << 16
    zf.writestr(info, b"")


def add_file(zf: zipfile.ZipFile, path: Path, arcname: str, data: bytes | None = None) -> None:
    info = zipfile.ZipInfo(arcname)
    info.external_attr = unix_mode(path, is_dir=False) << 16
    zf.writestr(info, data if data is not None else path.read_bytes())


def collect_files() -> list[Path]:
    files: list[Path] = []
    for d in INCLUDE_DIRS:
        root = ROOT / d
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if not p.is_file():
                continue
            if any(part in EXCLUDE_DIRS for part in p.parts):
                continue
            if p.suffix in EXCLUDE_SUFFIXES or p.name in EXCLUDE_NAMES:
                continue
            files.append(p)
    for name in INCLUDE_FILES:
        p = ROOT / name
        if p.is_file() and p.name not in EXCLUDE_NAMES:
            files.append(p)

    seen: set[Path] = set()
    uniq: list[Path] = []
    for p in files:
        r = p.resolve()
        if r in seen:
            continue
        seen.add(r)
        uniq.append(p)
    return uniq


def main() -> None:
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    pkg["scripts"]["prepare"] = "echo skip-husky"
    pkg["engines"] = {"node": ">=20 <23"}
    pkg_json_bytes = (json.dumps(pkg, indent=2, ensure_ascii=False) + "\n").encode("utf-8")

    files = collect_files()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output = ROOT.parent / f"virtuel-rt-SOURCE-hostinger-{timestamp}.zip"
    if output.exists():
        output.unlink()

    dirs_added: set[str] = set()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        add_file(zf, ROOT / "package.json", "package.json", pkg_json_bytes)

        for p in sorted(files, key=lambda x: x.as_posix()):
            if p.name == "package.json":
                continue
            rel = p.relative_to(ROOT).as_posix()
            parts = rel.split("/")
            for i in range(1, len(parts)):
                d = "/".join(parts[:i]) + "/"
                if d not in dirs_added:
                    add_dir(zf, d)
                    dirs_added.add(d)
            add_file(zf, p, rel)

    size_mb = output.stat().st_size / (1024 * 1024)
    with zipfile.ZipFile(output) as zf:
        print(f"Entrees : {len(zf.namelist())}")
    print(f"Archive : {output}")
    print(f"Taille  : {size_mb:.2f} Mo")
    print("Permissions ZIP : repertoires 755, fichiers 644 (.sh 755)")
    print("")
    print("Hostinger :")
    print("  1. Importer ce zip (deploiement Node / build sur serveur)")
    print("  2. Variables : VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY")
    print("  3. Build : npm run build  |  sortie : dist/")


if __name__ == "__main__":
    main()
