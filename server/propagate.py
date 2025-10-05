import datetime as dt
from typing import List, Dict
from skyfield.api import EarthSatellite, wgs84
from skyfield_utils import get_timescale

def propagate_positions(tle_record, start_time_utc: dt.datetime, minutes: int = 120, step_seconds: int = 60) -> List[Dict]:
    """
    Propagate positions using Skyfield+SGP4 and return geodetic samples.
    """
    ts = get_timescale()
    sat = EarthSatellite(tle_record.line1, tle_record.line2, tle_record.name, ts)

    samples = []
    steps = max(1, int((minutes * 60) // step_seconds))
    for k in range(steps + 1):
        t = start_time_utc + dt.timedelta(seconds=k * step_seconds)
        t_sf = ts.from_datetime(t)
        geocentric = sat.at(t_sf)
        sp = wgs84.subpoint(geocentric)
        lat = float(sp.latitude.degrees)
        lon = float(sp.longitude.degrees)
        alt_km = float(sp.elevation.km)
        samples.append({
            "t": t.isoformat().replace("+00:00", "Z"),
            "lat_deg": lat,
            "lon_deg": lon,
            "alt_km": alt_km
        })
    return samples