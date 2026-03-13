#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def read_version(root: Path) -> tuple[str, str]:
    raw = (root / "VERSION").read_text(encoding="utf-8").strip()
    if not raw:
        raise ValueError("VERSION file is empty")

    semver = raw.split("+", 1)[0].strip()
    if not re.match(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$", semver):
        raise ValueError(f"Invalid semantic version in VERSION: {raw}")

    return raw, semver


def sync_frontend_package(root: Path, semver: str) -> None:
    path = root / "frontend" / "package.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["version"] = semver
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def sync_ios_project(root: Path, semver: str) -> None:
    path = root / "frontend" / "ios" / "App" / "App.xcodeproj" / "project.pbxproj"
    content = path.read_text(encoding="utf-8")

    content = re.sub(r"MARKETING_VERSION = [^;]+;", f"MARKETING_VERSION = {semver};", content)
    content = re.sub(r"CURRENT_PROJECT_VERSION = [^;]+;", f"CURRENT_PROJECT_VERSION = {semver};", content)

    path.write_text(content, encoding="utf-8")


def sync_update_templates(root: Path, semver: str) -> None:
    templates = [
        ("stable", root / "scripts" / "update_templates" / "update-manifest.stable.json"),
        ("beta", root / "scripts" / "update_templates" / "update-manifest.beta.json"),
    ]

    for channel, path in templates:
        data = json.loads(path.read_text(encoding="utf-8"))
        data["version"] = semver
        data["package_url"] = f"https://updates.your-domain.com/{channel}/thokan-update-{semver}.tar.gz"
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    root = repo_root()
    _full_version, semver = read_version(root)

    sync_frontend_package(root, semver)
    sync_ios_project(root, semver)
    sync_update_templates(root, semver)

    print(f"Synchronized semantic version {semver} from VERSION")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
