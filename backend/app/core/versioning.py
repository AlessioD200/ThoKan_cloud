from __future__ import annotations

from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def get_runtime_version(default: str = "1.0.0") -> str:
    current_file = Path(__file__).resolve()
    for parent in current_file.parents:
        version_file = parent / "VERSION"
        if version_file.is_file():
            version = version_file.read_text(encoding="utf-8").strip()
            if version:
                return version
    return default
