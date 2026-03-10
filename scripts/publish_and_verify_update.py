#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.request import Request, urlopen


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish ThoKan update package and verify latest manifest/package URLs"
    )
    parser.add_argument("--channel", choices=["stable", "beta"], required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--package", required=True)
    parser.add_argument("--root", default="/var/www/thokan-updates")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--notes", default="")
    parser.add_argument("--timeout", type=int, default=15, help="HTTP timeout in seconds")
    parser.add_argument(
        "--skip-head",
        action="store_true",
        help="Skip HEAD request and verify package URL with a lightweight GET range request",
    )
    return parser.parse_args()


def http_get_text(url: str, timeout: int) -> str:
    req = Request(url, headers={"User-Agent": "ThoKan-Update-Verify/1.0"})
    with urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8")


def http_head_status(url: str, timeout: int) -> int:
    req = Request(url, method="HEAD", headers={"User-Agent": "ThoKan-Update-Verify/1.0"})
    with urlopen(req, timeout=timeout) as response:
        return int(getattr(response, "status", 200))


def http_get_range_status(url: str, timeout: int) -> int:
    req = Request(
        url,
        headers={
            "User-Agent": "ThoKan-Update-Verify/1.0",
            "Range": "bytes=0-0",
        },
    )
    with urlopen(req, timeout=timeout) as response:
        return int(getattr(response, "status", 200))


def main() -> int:
    args = parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    publish_script = repo_root / "scripts" / "publish_update.py"
    if not publish_script.exists():
        raise FileNotFoundError(f"Missing publish script: {publish_script}")

    command = [
        sys.executable,
        str(publish_script),
        "--channel",
        args.channel,
        "--version",
        args.version,
        "--package",
        args.package,
        "--root",
        args.root,
        "--base-url",
        args.base_url,
    ]
    if args.notes.strip():
        command.extend(["--notes", args.notes.strip()])

    subprocess.run(command, check=True)

    manifest_url = f"{args.base_url.rstrip('/')}/{args.channel}/latest.json"
    print(f"Verifying manifest: {manifest_url}")
    manifest_text = http_get_text(manifest_url, args.timeout)

    try:
        manifest = json.loads(manifest_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON at {manifest_url}: {exc}") from exc

    package_url = str(manifest.get("package_url") or "").strip()
    version = str(manifest.get("version") or "").strip()

    if version != args.version:
        raise RuntimeError(f"Manifest version mismatch: expected {args.version}, got {version or '(empty)'}")
    if not package_url:
        raise RuntimeError("Manifest has no package_url")

    print(f"Verifying package URL: {package_url}")
    status_code: int
    if args.skip_head:
        status_code = http_get_range_status(package_url, args.timeout)
    else:
        try:
            status_code = http_head_status(package_url, args.timeout)
        except Exception:
            print("HEAD verification failed, retrying with GET range...")
            status_code = http_get_range_status(package_url, args.timeout)

    if status_code >= 400:
        raise RuntimeError(f"Package URL returned HTTP {status_code}")

    print("Publish + verify completed successfully")
    print(f"Channel: {args.channel}")
    print(f"Version: {args.version}")
    print(f"Manifest: {manifest_url}")
    print(f"Package: {package_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
