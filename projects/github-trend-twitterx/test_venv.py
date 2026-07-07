#!/usr/bin/env python3
"""Quick venv test script."""
import sys
print(f"Python: {sys.version}")
try:
    import requests
    print(f"requests: {requests.__version__}")
except ImportError:
    print("requests: NOT FOUND")
    sys.exit(1)
