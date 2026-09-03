"""Short automated test runner."""
import sys
import pytest

if __name__ == "__main__":
    sys.exit(pytest.main(["backend/tests", "-v"]))
