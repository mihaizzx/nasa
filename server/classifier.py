import numpy as np
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("Warning: OpenCV not available. Image classification will use fallback method.")

from typing import Tuple, Dict, Any
from PIL import Image
import io

CATEGORIES = ["panel_solar", "fragment_metalic", "fragment_compozit", "adaptor_structural", "unknown"]

def classify_image(img_bytes: io.BytesIO) -> Tuple[str, float, Dict[str, Any]]:
    """
    Clasifică o imagine de deșeu spațial în categorii.
    Fallback simplu dacă OpenCV nu este disponibil.
    """
    if not CV2_AVAILABLE:
        # Fallback simplu fără OpenCV
        img = Image.open(img_bytes)
        width, height = img.size
        
        # Clasificare simplă bazată pe aspect ratio
        aspect_ratio = width / height if height > 0 else 1.0
        
        if aspect_ratio > 2.5:
            return "panel_solar", 0.7, {"image_size": [width, height], "aspect_ratio": aspect_ratio}
        elif aspect_ratio < 0.8:
            return "fragment_metalic", 0.6, {"image_size": [width, height], "aspect_ratio": aspect_ratio}
        else:
            return "adaptor_structural", 0.5, {"image_size": [width, height], "aspect_ratio": aspect_ratio}
    
    # Cod original cu OpenCV
    img = Image.open(img_bytes)
    img_np = np.array(img.convert("RGB"))
    h, w = img_np.shape[:2]
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    edge_ratio = float(np.sum(edges > 0)) / (h * w + 1e-6)

    cnts, _ = cv2.findContours((edges > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour_features = []
    for c in cnts:
        area = cv2.contourArea(c)
        if area < 0.001 * h * w:
            continue
        x, y, cw, ch = cv2.boundingRect(c)
        aspect = max(cw, ch) / (min(cw, ch) + 1e-6)
        fill_ratio = area / (cw * ch + 1e-6)
        contour_features.append((area, aspect, fill_ratio))

    label = "unknown"
    conf = 0.5

    if contour_features:
        contour_features.sort(reverse=True, key=lambda z: z[0])
        area, aspect, fill_ratio = contour_features[0]

        if aspect > 2.0 and fill_ratio > 0.5 and edge_ratio < 0.12:
            label = "panel_solar"
            conf = min(0.95, 0.6 + 0.2 * (aspect / 3.0) + 0.2 * fill_ratio)
        elif aspect <= 2.0 and fill_ratio > 0.6 and 0.08 <= edge_ratio <= 0.25:
            label = "adaptor_structural"
            conf = min(0.9, 0.55 + 0.35 * fill_ratio)
        elif edge_ratio > 0.2:
            label = "fragment_metalic"
            conf = min(0.9, 0.5 + 0.5 * min(1.0, (edge_ratio - 0.2) / 0.3))
        elif fill_ratio < 0.4 and 0.12 < edge_ratio <= 0.2:
            label = "fragment_compozit"
            conf = 0.6

    meta = {
        "edge_ratio": round(edge_ratio, 4),
        "n_contours": len(contour_features),
        "image_size": [int(h), int(w)],
        "rules": "heuristic_demo"
    }
    return label, float(conf), meta