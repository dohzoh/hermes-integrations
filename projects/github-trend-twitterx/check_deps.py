#!/usr/bin/env python3
"""Check Python dependencies for github-trend-twitterx."""
import importlib
import sys

deps = {
    "bs4": "beautifulsoup4",
    "requests": "requests",
    "lxml": "lxml",
}

ok = True
for mod, pkg in deps.items():
    try:
        imp = importlib.import_module(mod)
        ver = getattr(imp, "__version__", "unknown")
        print(f"✓ {mod} ({pkg}) version {ver}")
    except ImportError:
        print(f"✗ {mod} ({pkg}) — NOT INSTALLED")
        ok = False

sys.exit(0 if ok else 1)
