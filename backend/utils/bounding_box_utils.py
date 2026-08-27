"""Bounding box arithmetic — merging, scaling, coordinate transformations."""
from __future__ import annotations

from models.domain import BoundingBox


def merge_bounding_boxes(boxes: list[BoundingBox]) -> BoundingBox | None:
    """Return the smallest bounding box that contains all given boxes (same page)."""
    if not boxes:
        return None
    min_x = min(b.x for b in boxes)
    min_y = min(b.y for b in boxes)
    max_x = max(b.x + b.width for b in boxes)
    max_y = max(b.y + b.height for b in boxes)
    return BoundingBox(
        x=min_x, y=min_y,
        width=max_x - min_x,
        height=max_y - min_y,
        page_number=boxes[0].page_number,
    )


def scale_bounding_box(box: BoundingBox, scale_x: float, scale_y: float) -> BoundingBox:
    """Scale a bounding box by given x/y factors (for zoom calculations)."""
    return BoundingBox(
        x=box.x * scale_x,
        y=box.y * scale_y,
        width=box.width * scale_x,
        height=box.height * scale_y,
        page_number=box.page_number,
    )


def boxes_overlap(a: BoundingBox, b: BoundingBox, threshold: float = 0.0) -> bool:
    """Return True if two bounding boxes overlap (on the same page)."""
    if a.page_number != b.page_number:
        return False
    return not (
        a.x2 <= b.x + threshold
        or b.x2 <= a.x + threshold
        or a.y2 <= b.y + threshold
        or b.y2 <= a.y + threshold
    )


def iou(a: BoundingBox, b: BoundingBox) -> float:
    """Intersection-over-union of two bounding boxes."""
    if a.page_number != b.page_number:
        return 0.0
    ix1 = max(a.x, b.x)
    iy1 = max(a.y, b.y)
    ix2 = min(a.x2, b.x2)
    iy2 = min(a.y2, b.y2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    union = a.width * a.height + b.width * b.height - inter
    return inter / union if union > 0 else 0.0


def sort_boxes_top_to_bottom(boxes: list[BoundingBox]) -> list[BoundingBox]:
    """Sort bounding boxes by page, then top-to-bottom (y coordinate)."""
    return sorted(boxes, key=lambda b: (b.page_number, b.y, b.x))


def xywh_to_bbox(x: float, y: float, w: float, h: float,
                 page: int = 1) -> BoundingBox:
    """Create BoundingBox from x, y, width, height values."""
    return BoundingBox(x=x, y=y, width=w, height=h, page_number=page)


def xyxy_to_bbox(x1: float, y1: float, x2: float, y2: float,
                 page: int = 1) -> BoundingBox:
    """Create BoundingBox from top-left and bottom-right corner coords."""
    return BoundingBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1, page_number=page)


def pad_bounding_box(box: BoundingBox, padding: int,
                     img_w: int, img_h: int) -> BoundingBox:
    """Expand a bounding box by padding pixels, clamped to image dimensions."""
    return BoundingBox(
        x=max(0.0, box.x - padding),
        y=max(0.0, box.y - padding),
        width=min(img_w - box.x + padding, box.width + 2 * padding),
        height=min(img_h - box.y + padding, box.height + 2 * padding),
        page_number=box.page_number,
    )
