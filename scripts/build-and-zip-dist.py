#!/usr/bin/env python3
"""Build production dist/ and zip it for direct upload to Hostinger public_html."""

import os
import shutil
import stat
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def load_env_local() -> dict[str, str]:
    env_file = ROOT / ".env.local"
    if not env_file.exists():
        return {}
    values: dict[str, str] = {}
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def run_build() -> None:
    env = os.environ.copy()
    for key in ("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_SENTRY_DSN"):
        if key not in env and key in load_env_local():
            env[key] = load_env_local()[key]

    if not env.get("VITE_SUPABASE_URL") or not env.get("VITE_SUPABASE_ANON_KEY"):
        print("ERREUR: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis (.env.local ou env)")
        sys.exit(1)

    print("Build production (npm run build)...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    subprocess.run([npm_cmd, "run", "build"], cwd=ROOT, env=env, check=True, shell=os.name == "nt")


def zip_dist(output: Path) -> None:
    if not DIST.exists():
        raise FileNotFoundError(f"Dossier dist/ introuvable: {DIST}")

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for path in sorted(DIST.rglob("*")):
            arcname = path.relative_to(DIST).as_posix()
            if path.is_dir():
                info = zipfile.ZipInfo(arcname + "/")
                info.external_attr = (stat.S_IFDIR | 0o755) << 16
                zf.writestr(info, b"")
            else:
                info = zipfile.ZipInfo(arcname)
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                zf.writestr(info, path.read_bytes())


def main() -> int:
    run_build()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output = ROOT.parent / f"virtuel-rt-dist-{timestamp}.zip"
    zip_dist(output)
    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"\nArchive dist prete : {output}")
    print(f"Taille : {size_mb:.2f} Mo")
    print("\nHostinger : extraire le contenu dans public_html/ (pas le dossier dist lui-meme)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
