#!/usr/bin/env python3
"""Build a Hostinger-ready SOURCE zip from the current workspace (incl. uncommitted)."""
from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTS = [
    Path(r"C:\Users\user\Documents\Nouveau dossier\virtuel-rt-SOURCE-FULL-hostinger.zip"),
    Path(r"C:\Users\user\Documents\virtuel-rt-SOURCE-FULL-hostinger.zip"),
]
NOTE = Path(r"C:\Users\user\Documents\Nouveau dossier\DEPLOI-HOSTINGER-FULL.txt")

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
]
EXCLUDE_DIRS = {"node_modules", ".git", "coverage", "dist", "__pycache__", ".husky", ".temp"}
EXCLUDE_SUFFIXES = {".bak"}
EXCLUDE_NAMES = {".env.local", ".env"}


def main() -> None:
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    pkg["scripts"]["prepare"] = "echo skip-husky"
    pkg["engines"] = {"node": ">=20 <23"}

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

    primary = OUTS[0]
    primary.parent.mkdir(parents=True, exist_ok=True)
    if primary.exists():
        primary.unlink()

    with zipfile.ZipFile(primary, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("package.json", json.dumps(pkg, indent=2, ensure_ascii=False) + "\n")
        for p in uniq:
            if p.name == "package.json":
                continue
            zf.write(p, arcname=p.relative_to(ROOT).as_posix())

    with zipfile.ZipFile(primary) as zf:
        names = zf.namelist()
        assert "package.json" in names
        assert "src/pages/Home.tsx" in names
        assert "src/components/chat/QuizPanel.tsx" in names
        quiz = zf.read("src/components/chat/QuizPanel.tsx").decode("utf-8")
        home = zf.read("src/pages/Home.tsx").decode("utf-8")
        css = zf.read("src/index.css").decode("utf-8")
        prefs = zf.read("src/lib/contexts/PreferencesContext.tsx").decode("utf-8")
        assert "Changer de thème" in quiz, "quiz themes missing"
        assert "QUIZ_THEMES" in quiz
        assert "lazyWithReload" not in home
        assert "import ChatArea from" in home
        assert "ambiance-nebula" in css
        assert "ambiance-phosphor" in css
        assert "Nébuleuse" in prefs
        print("entries", len(names))
        print("size_mb", round(primary.stat().st_size / 1e6, 2))
        print("has_banned", "src/lib/bannedWords.ts" in names)

    for dest in OUTS[1:]:
        shutil.copy2(primary, dest)

    NOTE.write_text(
        "\n".join(
            [
                "Virtuel-RT — zip SOURCE COMPLET (workspace local actuel)",
                "",
                "Fichier: virtuel-rt-SOURCE-FULL-hostinger.zip",
                "",
                "Inclus:",
                "- Fix React #306 (ChatArea + panels en import statique)",
                "- Themes quiz (Changer de theme)",
                "- ScenePanel (fc35107)",
                "- Ambiances Nebuleuse / Phosphore / Abysse / Braises / Spectre / Aurore",
                "- DM, MediaBar, WebRTC, badges, prefs, WelcomeScreen, bannedWords, etc.",
                "",
                "Hostinger > Parametres et redeploiement:",
                "1. Importer CE zip (pas DIST)",
                "2. Vars env: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY",
                "3. Build: npm run build / sortie dist / Node 20",
                "4. Apres: vider donnees du site (SW) puis Ctrl+F5",
                "5. Verifier quiz: bouton Changer de theme",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print("OUT", primary)
    print("NOTE", NOTE)


if __name__ == "__main__":
    main()
