#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish a ThoKan update package to stable/beta and update latest.json"
    )
    parser.add_argument("--channel", choices=["stable", "beta"], required=True, help="Update channel")
    parser.add_argument("--version", required=True, help="Version string, e.g. 1.0.0 or 1.1.0-beta.1")
    parser.add_argument("--package", required=True, help="Path to .zip/.tar/.tar.gz/.tgz package")
    parser.add_argument(
        "--root",
        default="/var/www/thokan-updates",
        help="Update host root directory (default: /var/www/thokan-updates)",
    )
    parser.add_argument(
        "--base-url",
        required=True,
        help="Public base URL, e.g. https://updates.your-domain.com",
    )
    parser.add_argument(
        "--notes",
        default="",
        help="Optional release notes text for manifest",
    )
    return parser.parse_args()


def validate_package(package_path: Path) -> None:
    name = package_path.name.lower()
    allowed = (".zip", ".tar", ".tar.gz", ".tgz")
    if not any(name.endswith(ext) for ext in allowed):
        raise ValueError("Package must be one of: .zip, .tar, .tar.gz, .tgz")


def main() -> int:
    args = parse_args()
    package_path = Path(args.package).expanduser().resolve()
    if not package_path.exists() or not package_path.is_file():
        raise FileNotFoundError(f"Package not found: {package_path}")

    validate_package(package_path)

    root_dir = Path(args.root).expanduser().resolve()
    channel_dir = root_dir / args.channel
    channel_dir.mkdir(parents=True, exist_ok=True)

    target_package = channel_dir / package_path.name
    shutil.copy2(package_path, target_package)

    base = args.base_url.rstrip("/")
    package_url = f"{base}/{args.channel}/{target_package.name}"

    manifest = {
        "version": args.version,
        "channel": args.channel,
        "package_url": package_url,
        "published_at": datetime.now(UTC).isoformat(),
    }
    if args.notes.strip():
        manifest["notes"] = args.notes.strip()

    latest_manifest_path = channel_dir / "latest.json"
    latest_manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Published package: {target_package}")
    print(f"Updated manifest: {latest_manifest_path}")
    print(f"Channel URL: {base}/{args.channel}/latest.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
