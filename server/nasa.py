import os
import datetime as dt
from typing import List, Dict, Any, Optional

import requests

NASA_API_KEY = os.getenv("NASA_API_KEY", "mSDMpl3uGi7uuc67o4nR3gdnMUtQLn1afkgwJB8U")
DONKI_GST_URL = "https://api.nasa.gov/DONKI/GST"

def fetch_donki_gst(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch NASA DONKI Geomagnetic Storm (GST) events.
    Dates in 'YYYY-MM-DD' format. If None, last 7 days.
    """
    if not start_date or not end_date:
        end = dt.date.today()
        start = end - dt.timedelta(days=7)
        start_date = start.isoformat()
        end_date = end.isoformat()

    params = {
        "startDate": start_date,
        "endDate": end_date,
        "api_key": NASA_API_KEY
    }
    r = requests.get(DONKI_GST_URL, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def latest_kp_index(events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    From a list of GST events, find the latest Kp measurement.
    Returns: dict with {observedTime, kpIndex} or None.
    """
    latest = None
    latest_time = None
    for e in events:
        for kp in e.get("allKpIndex", []):
            obs = kp.get("observedTime")
            val = kp.get("kpIndex")
            if not obs or val is None:
                continue
            try:
                t = dt.datetime.fromisoformat(obs.replace("Z", "+00:00"))
            except Exception:
                continue
            if (latest_time is None) or (t > latest_time):
                latest_time = t
                latest = {"observedTime": obs, "kpIndex": val}
    return latest