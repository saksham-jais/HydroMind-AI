import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.resolve()))

# Set env var so it doesn't try to use cloud config if it doesn't exist
from app.services.firebase import get_villages
print(get_villages())
