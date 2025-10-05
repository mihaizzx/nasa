import csv
import math
import os
from functools import lru_cache
from typing import Tuple, List, Dict, Optional

from skyfield.api import EarthSatellite
from skyfield_utils import get_timescale

# Simplified ORDEM-like grid sample:
# columns: altitude_km,inclination_deg,size_min_cm,size_max_cm,flux_per_m2_per_year
_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
SAMPLE_FILE = os.path.join(_DATA_DIR, 'ordem_flux_sample.csv')

@lru_cache(maxsize=1)
def _load_flux_table() -> List[Dict]:
    rows: List[Dict] = []
    with open(SAMPLE_FILE, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            rows.append({
                "alt_km": float(row["altitude_km"]),
                "inc_deg": float(row["inclination_deg"]),
                "smin": float(row["size_min_cm"]),
                "smax": float(row["size_max_cm"]),
                "flux": float(row["flux_per_m2_per_year"])
            })
    return rows

def _neighbors(alt_km: float, inc_deg: float, smin: float, smax: float, rows: List[Dict]) -> List[Dict]:
    candidates = [r for r in rows if r["smin"] == smin and r["smax"] == smax]
    alts = sorted({r["alt_km"] for r in candidates})
    incs = sorted({r["inc_deg"] for r in candidates})

    a1 = max([a for a in alts if a <= alt_km], default=alts[0])
    a2 = min([a for a in alts if a >= alt_km], default=alts[-1])
    i1 = max([i for i in incs if i <= inc_deg], default=incs[0])
    i2 = min([i for i in incs if i >= inc_deg], default=incs[-1])

    grid = []
    for A in (a1, a2):
        for I in (i1, i2):
            m = next((r for r in candidates if abs(r["alt_km"] - A) < 1e-6 and abs(r["inc_deg"] - I) < 1e-6), None)
            if m:
                grid.append(m)
    return grid

def _bilinear(alt_km: float, inc_deg: float, grid: List[Dict]) -> float:
    a_vals = sorted({g["alt_km"] for g in grid})
    i_vals = sorted({g["inc_deg"] for g in grid})
    if len(a_vals) < 2 or len(i_vals) < 2:
        gmin = min(grid, key=lambda g: (abs(g["alt_km"]-alt_km)+abs(g["inc_deg"]-inc_deg)))
        return gmin["flux"]

    a1, a2 = a_vals[0], a_vals[1]
    i1, i2 = i_vals[0], i_vals[1]

    def flux_at(A,I):
        for g in grid:
            if abs(g["alt_km"]-A)<1e-6 and abs(g["inc_deg"]-I)<1e-6:
                return g["flux"]
        return None

    f11 = flux_at(a1,i1); f12 = flux_at(a1,i2)
    f21 = flux_at(a2,i1); f22 = flux_at(a2,i2)
    t = 0.0 if a2==a1 else (alt_km - a1) / (a2 - a1)
    u = 0.0 if i2==i1 else (inc_deg - i1) / (i2 - i1)
    return (
        f11*(1-t)*(1-u) +
        f21*(t)*(1-u) +
        f12*(1-t)*(u) +
        f22*(t)*(u)
    )

def flux_ordem_like(alt_km: float, inc_deg: float, size_min_cm: float, size_max_cm: float) -> float:
    """
    Returns debris flux (#/m^2/year) for the given altitude, inclination and size range.
    Uses a small sample table for demo; replace with real ORDEM data in production.
    """
    rows = _load_flux_table()
    grid = _neighbors(alt_km, inc_deg, size_min_cm, size_max_cm, rows)
    if not grid:
        rows_sorted = sorted(rows, key=lambda r: abs(r["alt_km"]-alt_km)+abs(r["inc_deg"]-inc_deg)+abs(r["smin"]-size_min_cm)+abs(r["smax"]-size_max_cm))
        return rows_sorted[0]["flux"]
    return _bilinear(alt_km, inc_deg, grid)

def annual_collision_probability(cross_section_m2: float, years: float, flux_per_m2_per_year: float) -> float:
    """
    Poisson approximation: P = 1 - exp(-F * A * T)
    """
    lam = flux_per_m2_per_year * cross_section_m2 * years
    return 1.0 - math.exp(-lam)

def inclination_from_tle(line1: str, line2: str, name: str = "OBJ") -> float:
    ts = get_timescale()
    sat = EarthSatellite(line1, line2, name, ts)
    inc_rad = sat.model.inclo
    return math.degrees(inc_rad)