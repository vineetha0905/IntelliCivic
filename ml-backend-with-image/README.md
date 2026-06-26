IntelliCivic ML Backend (Full: pHash + Location)

Overview:

- FastAPI backend that accepts citizen reports and performs:
  - rule-based abuse detection
  - text duplicate detection
  - image duplicate detection using pHash (imagehash)
  - location-based duplicate detection using Haversine formula
  - image classification using CLIP (if available) with URL fallback
  - priority detection (keyword-based)

Run:

1. python3 -m venv .venv 
2. source .venv/bin/activate # Windows: c
3. pip install -r requirements.txt
4. uvicorn app.main:app --reload --port 8000

Notes:

- The in-memory stores (seen_reports, seen_image_hashes, seen_locations) are ephemeral and reset on server restart.
- CLIP model download requires internet and may take time; if unavailable, the system uses URL keyword fallback for image labels.
- data/dataset.jsonl collects all incoming reports and results for later training/audit.
