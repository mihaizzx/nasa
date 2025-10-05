from dataclasses import dataclass
from typing import Dict, List, Optional
import re

@dataclass
class TLERecord:
    name: str
    line1: str
    line2: str
    norad_id: int

class TLEStore:
    def __init__(self):
        self._by_id: Dict[int, TLERecord] = {}

    def clear(self):
        self._by_id.clear()

    def load_from_text(self, tle_text: str) -> int:
        """
        Parse classic TLE text (blocks of 3 lines: name, line1, line2).
        """
        lines = [l.strip() for l in tle_text.splitlines() if l.strip()]
        count = 0
        i = 0
        while i + 2 < len(lines):
            name = lines[i]
            l1 = lines[i + 1]
            l2 = lines[i + 2]
            # Validate typical TLE line starts
            if not (l1.startswith("1 ") and l2.startswith("2 ")):
                # Try shift if name omitted
                if lines[i].startswith("1 ") and lines[i+1].startswith("2 "):
                    name = "UNKNOWN"
                    l1 = lines[i]
                    l2 = lines[i+1]
                    i += 2
                else:
                    i += 1
                    continue
            else:
                i += 3

            norad = self._extract_norad(l1)
            if norad is None:
                continue

            rec = TLERecord(name=name, line1=l1, line2=l2, norad_id=norad)
            self._by_id[norad] = rec
            count += 1
        return count

    def _extract_norad(self, line1: str) -> Optional[int]:
        # Line 1 columns 3-7 = satellite catalog number (NORAD)
        try:
            m = re.match(r"1\s+(\d+)", line1)
            if m:
                return int(m.group(1))
            return None
        except Exception:
            return None

    def get(self, norad_id: int) -> Optional[TLERecord]:
        return self._by_id.get(norad_id)

    def list_objects(self, limit: int = 100) -> List[dict]:
        items = []
        for k, rec in list(self._by_id.items())[:limit]:
            items.append({"norad_id": rec.norad_id, "name": rec.name})
        return items