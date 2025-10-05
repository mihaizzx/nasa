"""Utility helpers for working with Skyfield in offline/demo environments."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from skyfield.api import Loader, load


_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'skyfield_cache'))
_loader = Loader(_DATA_DIR)


@lru_cache(maxsize=1)
def get_timescale():
    """Return a Skyfield timescale without requiring network access.

    We prefer the builtin ephemeris data and cache the resulting instance so the
    expensive initialisation only happens once per process. If builtin data
    is unavailable (older Skyfield) we fall back to the default loader which
    may use locally cached files.
    """
    errors: List[str] = []

    for loader_instance in (load, _loader):
        for kwargs in ({'builtin': True}, {}):
            try:
                return loader_instance.timescale(**kwargs)
            except TypeError:
                # Older Skyfield versions might not accept the builtin flag.
                continue
            except Exception as exc:
                location = getattr(loader_instance, 'directory', 'default')
                errors.append(f"{location}: {exc}")
                continue

    detail = '; '.join(errors) if errors else 'no timescale sources succeeded'
    raise RuntimeError(f'Unable to initialise Skyfield timescale ({detail}).')


__all__ = ['get_timescale']
