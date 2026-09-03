"""Short ML & Decision evaluation runner."""
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scripts.evaluate_models import run_evaluation_pipeline

if __name__ == "__main__":
    run_evaluation_pipeline()
