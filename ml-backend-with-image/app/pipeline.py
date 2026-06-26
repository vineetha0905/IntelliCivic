from app import storage, dataset
from app import image_classifier as ic
from app.text_rules import (
    is_abusive,
    detect_category,
    detect_urgency,
    CATEGORY_KEYWORDS,
    contains
)

# Confidence threshold for category detection
CATEGORY_CONFIDENCE_THRESHOLD = 0.1  # Minimum confidence to accept category (lowered to reduce false rejections)
import warnings

warnings.filterwarnings("ignore", category=UserWarning, message=".*pkg_resources.*")


# ------------------------------------
# Image → Category reference (COMPREHENSIVE)
# ------------------------------------
IMAGE_TO_CATEGORY_MAP = {
    "Road & Traffic": [
        "pothole", "damaged road", "illegal parking", "broken footpath",
        "traffic signal not working", "road accident", "road", "street", "traffic",
        "speed breaker", "crosswalk", "footpath", "pavement", "crack", "broken road",
        "road caved", "road sinking", "uneven road", "traffic jam", "congestion",
        "signal", "junction", "crossroad", "accident", "collision", "crash", "hit",
        "speed bump", "divider", "sidewalk", "zebra crossing", "pedestrian", "highway",
        "bridge", "intersection", "pavement", "asphalt"
    ],
    "Garbage & Sanitation": [
        "garbage dump", "overflowing dustbin", "open drain", "sewage overflow",
        "dead animal", "toilet issue", "garbage", "trash", "waste", "bin",
        "sanitation", "dirty", "sewage", "cleanliness", "dustbin", "dump", "dumping",
        "garbage pile", "waste pile", "filthy", "unclean", "bad smell", "toxic smell",
        "foul smell", "overflowing bin", "sewer", "manhole", "dead", "animal carcass",
        "dead dog", "dead cat", "dead cow", "dead body", "mosquito", "flies", "infection", "disease"
    ],
    "Street Lighting": [
        "streetlight not working", "fallen electric pole", "loose wire", "power outage",
        "streetlight", "lamp", "bulb", "pole", "light", "electric pole",
        "street lamp", "lighting", "dark area", "electricity", "power",
        "broken streetlight", "non-working light", "flickering light", "dim light",
        "street lighting", "outdoor lighting", "public lighting", "night lighting",
        "lamp post", "pole light", "not working", "broken light", "flickering",
        "dark", "no lighting", "illumination"
    ],
    "Water & Drainage": [
        "waterlogging", "pipe burst", "no water supply", "drainage issue", "flood",
        "drain", "drainage", "sewage", "sewer", "leak", "leaking", "leakage",
        "pipe", "water", "overflow", "water supply", "drainage system",
        "no water", "low pressure", "drinking water", "contaminated water",
        "pipe leak", "broken pipe", "blocked drain", "overflowing drain",
        "stagnant water", "sewage water", "rain water", "water pipe"
    ],
    "Parks & Recreation": [
        "tree fallen", "illegal construction", "park maintenance", "encroachment",
        "park", "garden", "playground", "tree", "bench", "grass", "lawn",
        "recreation", "green space", "park area", "garden area", "flooded park",
        "water in park", "park with water", "playground equipment", "walking path",
        "fountain", "pond", "lake", "outdoor space", "public space",
        "children park", "public park", "swing", "slide", "walking track",
        "fallen tree", "broken fence", "garden bench"
    ],
    "Public Safety": [
        "fire", "gas leak", "building collapse", "accident site",
        "crime", "robbery", "theft", "violence", "hazard", "danger",
        "safety", "harassment", "emergency", "accident", "smoke", "burning",
        "gas", "cylinder leak", "collapse", "wall collapse", "roof falling",
        "theft", "fight", "assault", "unsafe", "life risk", "explosion"
    ],
    "Electricity": [
        "electric", "electricity", "power", "outage", "wire", "transformer",
        "short circuit", "shock", "cable", "meter", "electrical", "voltage", "current",
        "no power", "power cut", "pole", "electric pole", "spark",
        "electrocution", "electric shock", "live wire", "power line"
    ]
}

GENERIC_IMAGE_LABELS = {
    "other", "outdoor", "outdoor space", "public space", "area", "scene", "general"
}


# ------------------------------------
# Model initialization
# ------------------------------------
import re

def initialize_models():
    """Initialize ML models (CLIP for image classification)"""
    try:
        ic.initialize_clip()
    except Exception as e:
        print(f"Model initialization failed (will use fallback): {str(e)}")
        pass


# Category normalizer mapping various frontend forms to standard keys
def normalize_category(cat: str) -> str:
    if not cat:
        return "Other"
    cat_lower = cat.lower().replace("&", "and").replace(" ", "").replace("-", "")
    
    # Mapping various forms to standard ML categories
    if "road" in cat_lower or "traffic" in cat_lower:
        return "Road & Traffic"
    if "garbage" in cat_lower or "sanitation" in cat_lower or "trash" in cat_lower:
        return "Garbage & Sanitation"
    if "streetlight" in cat_lower or "streetlamp" in cat_lower or "lamp" in cat_lower or "light" in cat_lower:
        return "Street Lighting"
    if "water" in cat_lower or "drain" in cat_lower or "sewage" in cat_lower or "leak" in cat_lower:
        return "Water & Drainage"
    if "park" in cat_lower or "recreation" in cat_lower or "garden" in cat_lower:
        return "Parks & Recreation"
    if "safety" in cat_lower or "hazard" in cat_lower or "fire" in cat_lower or "crime" in cat_lower:
        return "Public Safety"
    if "electr" in cat_lower or "power" in cat_lower:
        return "Electricity"
    
    # Exact/partial mappings
    for standard_cat in ["Road & Traffic", "Garbage & Sanitation", "Street Lighting", "Water & Drainage", "Parks & Recreation", "Public Safety", "Electricity"]:
        std_lower = standard_cat.lower().replace("&", "and").replace(" ", "")
        if std_lower in cat_lower or cat_lower in std_lower:
            return standard_cat
            
    return "Other"


def image_matches_category_label(image_label: str, category: str) -> bool:
    """
    Returns True if the classified image label is compatible with the given category.
    """
    image_label = image_label.lower().strip()
    
    # Get allowed labels and keywords for this category
    allowed_labels = [lbl.lower() for lbl in IMAGE_TO_CATEGORY_MAP.get(category, [])]
    category_keywords = [kw.lower() for kw in CATEGORY_KEYWORDS.get(category, [])]

    # Direct exact match
    if image_label in allowed_labels:
        return True

    # Substring match
    for lbl in allowed_labels:
        if lbl in image_label or image_label in lbl:
            return True

    # Category keywords match
    for kw in category_keywords:
        if kw in image_label or image_label in kw:
            return True

    # Word-level matching
    image_words = set(image_label.split())
    for lbl in allowed_labels:
        lbl_words = set(lbl.split())
        common_words = image_words.intersection(lbl_words)
        if common_words:
            return True

    for word in image_words:
        if len(word) > 2:
            for kw in category_keywords:
                if word in kw or kw in word:
                    return True
            for lbl in allowed_labels:
                if word in lbl or lbl in word:
                    return True

    return False


def is_spam_description(desc: str) -> bool:
    desc_clean = desc.strip().lower()
    if not desc_clean or len(desc_clean) < 10:
        return True
    
    # Check for repeated characters like "aaaaaaa" or "123123123"
    if re.match(r'^([a-zA-Z0-9])\1+$', desc_clean):
        return True

    # Check for repeated sequences of length >= 1 (e.g. 123123123)
    # Check if string has very low unique characters count
    unique_chars = set(desc_clean.replace(" ", ""))
    if len(unique_chars) <= 3 and len(desc_clean.replace(" ", "")) >= 6:
        return True
    
    # Check if there are no vowels in alphabetical words (helps catch "asdfghjkl", "qwrtypsdfg")
    words = [w for w in desc_clean.split() if w.isalpha()]
    if words:
        all_words_no_vowels = all(len(w) > 3 and not any(v in w for v in 'aeiou') for w in words)
        if all_words_no_vowels:
            return True
            
    # Repeated words check (e.g. "test test test")
    all_words = desc_clean.split()
    if len(all_words) >= 3:
        if len(set(all_words)) == 1:
            return True
        if len(set(all_words)) / len(all_words) < 0.3:
            return True
            
    return False


# ------------------------------------
# Main pipeline (OPTIMIZED & STRICT)
# ------------------------------------
def classify_report(report: dict):
    try:
        description = (report.get("description") or "").strip()
        selected_cat_raw = report.get("category")
        selected_cat = normalize_category(selected_cat_raw) if selected_cat_raw else None

        # 1. Spam & Meaningless Description Detection
        if is_spam_description(description):
            return reject(report, "Invalid or spam description.", confidence=0.0)

        # 2. Abusive Language check
        if is_abusive(description):
            return reject(
                report,
                "Abusive language detected. Please remove inappropriate words before submitting your complaint.",
                confidence=0.0,
                validation="profanity_detected"
            )

        # 3. Description Category match
        try:
            category, confidence = detect_category(description)
        except Exception as e:
            return reject(report, "Unable to verify uploaded image.", "Other", 0.0)

        # If description doesn't resolve to a valid category, reject
        if category == "Other" or confidence < CATEGORY_CONFIDENCE_THRESHOLD:
            return reject(report, "Invalid or spam description.", category, confidence)

        # If selected category is provided, check description matches selected category
        if selected_cat and selected_cat != "Other":
            pred_cat_norm = normalize_category(category)
            if pred_cat_norm != selected_cat:
                selected_keywords = CATEGORY_KEYWORDS.get(selected_cat, [])
                description_clean = description.lower()
                has_selected_keyword = any(contains(description_clean, kw) for kw in selected_keywords)
                if not has_selected_keyword:
                    if report.get("image_bytes"):
                        return reject(
                            report,
                            "Image does not match the selected category, issue title, or complaint description.",
                            category,
                            confidence,
                            validation="image_content_mismatch"
                        )
                    else:
                        return reject(
                            report,
                            "Category mismatch between description and selected category.",
                            category,
                            confidence,
                            validation="category_mismatch"
                        )

        # 4. Duplicate Checks (same user, description, category)
        user_id = report.get("user_id", "anon")
        try:
            if storage.is_duplicate(user_id, description, category, store=False):
                return reject(report, "Duplicate report detected.", category, confidence)
        except Exception as e:
            print(f"[ERROR] Text duplicate check failed: {str(e)}")

        # Check for location-based duplicate (same category within 10 meters)
        latitude = report.get("latitude")
        longitude = report.get("longitude")
        if latitude is not None and longitude is not None:
            try:
                if storage.is_duplicate_location(latitude, longitude, description, category, threshold=10.0, store=False):
                    return reject(report, "Duplicate report detected.", category, confidence)
            except Exception as e:
                print(f"[ERROR] Location duplicate check failed: {str(e)}")

        # 5. Image validations
        image_bytes = report.get("image_bytes")
        if image_bytes:
            try:
                # Classify image
                image_label = ic.classify_image_from_bytes(image_bytes)
                image_label = str(image_label).lower().strip() if image_label else "other"
                
                # Check if image classification is empty or generic/unidentified
                if not image_label or image_label == "other" or image_label in GENERIC_IMAGE_LABELS:
                    return reject(report, "Unable to verify uploaded image.", category, confidence)
                
                # Check if image category matches selected category
                image_matches_selected = False
                if selected_cat and selected_cat != "Other":
                    image_matches_selected = image_matches_category_label(image_label, selected_cat)
                else:
                    image_matches_selected = True # No category selected
                
                # Check if image category matches predicted category
                image_matches_predicted = image_matches_category_label(image_label, category)

                # Check if image category matches title category
                title = report.get("title", "")
                image_matches_title = True
                if title:
                    title_cat, _ = detect_category(title)
                    if title_cat != "Other":
                        image_matches_title = image_matches_category_label(image_label, title_cat)

                if not image_matches_selected or not image_matches_predicted or not image_matches_title:
                    return reject(
                        report,
                        "Image does not match the selected category, issue title, or complaint description.",
                        category,
                        confidence,
                        validation="image_content_mismatch"
                    )

                # Check duplicate images
                if storage.is_duplicate_image_from_bytes(image_bytes, threshold=0, store=False):
                    return reject(report, "Duplicate report detected.", category, confidence)

            except Exception as e:
                print(f"[ERROR] Image classification failed: {str(e)}")
                return reject(report, "Unable to verify uploaded image.", category, confidence)

        urgency = detect_urgency(description)
        
        # Prepare result
        result = {
            "report_id": report.get("report_id", "unknown"),
            "accept": True,
            "status": "accepted",
            "category": category,
            "confidence": round(confidence, 2),
            "urgency": urgency,
            "reason": "Report accepted successfully",
            "user_id": user_id,
            "description": description,
            "latitude": latitude,
            "longitude": longitude
        }
        
        # Compute and store image hash if image is provided
        if image_bytes:
            try:
                from PIL import Image
                import imagehash
                import io
                img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
                img_hash = imagehash.phash(img)
                result["image_hash"] = str(img_hash)
            except Exception as e:
                print(f"[WARNING] Failed to compute image hash (non-critical): {str(e)}")

        # Save to dataset
        report_for_save = {**report, **result}
        if "image_bytes" in report_for_save:
            del report_for_save["image_bytes"]
        
        try:
            dataset.save_report(report_for_save)
            print(f"[DEBUG] Successfully saved accepted report to dataset")
        except Exception as e:
            print(f"[ERROR] Failed to save report to dataset: {str(e)}")
        
        return result

    except Exception as e:
        print(f"[ERROR] Critical error in classify_report: {str(e)}")
        return reject(report, "Unable to verify uploaded image.", confidence=0.0)


# ------------------------------------
# Image validation logic (STRICT & ACCURATE) - FROM BYTES
# ------------------------------------
def image_matches_category_from_bytes(image_bytes: bytes, category: str) -> bool:
    """
    Check if image matches the detected category.
    Works with image bytes directly (no URL required).
    Returns True ONLY if image is clearly related to category.
    Returns False if image is unrelated or classification fails.
    """
    try:
        image_label = ic.classify_image_from_bytes(image_bytes)
        image_label = str(image_label).lower().strip() if image_label else "other"
        
        # If classifier completely fails, reject (don't allow unknown images)
        if not image_label or image_label == "":
            print(f"Image classification returned empty - rejecting")
            return False
        
        # Get allowed labels and keywords for this category
        allowed_labels = [lbl.lower() for lbl in IMAGE_TO_CATEGORY_MAP.get(category, [])]
        category_keywords = [kw.lower() for kw in CATEGORY_KEYWORDS.get(category, [])]

        # If "other" - this means classifier couldn't identify, REJECT it
        # Don't allow "other" - it means image doesn't match any known category
        if image_label == "other":
            print(f"Image classified as 'other' - does not match category '{category}' - rejecting")
            return False

        # If generic label, also reject (too vague, likely doesn't match)
        if image_label in GENERIC_IMAGE_LABELS:
            print(f"Image classified as generic '{image_label}' - does not match category '{category}' - rejecting")
            return False

        # Method 1: Direct exact match with allowed labels
        if image_label in allowed_labels:
            print(f"Image label '{image_label}' exactly matches category '{category}' - accepting")
            return True

        # Method 2: Check if image label contains any allowed label (substring match)
        for lbl in allowed_labels:
            if lbl in image_label or image_label in lbl:
                print(f"Image label '{image_label}' contains allowed label '{lbl}' for category '{category}' - accepting")
                return True

        # Method 3: Check if image label contains any category keyword from description
        for kw in category_keywords:
            if kw in image_label or image_label in kw:
                print(f"Image label '{image_label}' matches keyword '{kw}' for category '{category}' - accepting")
                return True

        # Method 4: Word-level matching (split and check for common words)
        image_words = set(image_label.split())
        for lbl in allowed_labels:
            lbl_words = set(lbl.split())
            common_words = image_words.intersection(lbl_words)
            if common_words and len(common_words) > 0:
                print(f"Image label '{image_label}' shares words with '{lbl}' for category '{category}' - accepting")
                return True

        # Method 5: Check if any word from image appears in category keywords
        for word in image_words:
            if len(word) > 2:  # Only check meaningful words (length > 2)
                for kw in category_keywords:
                    if word in kw or kw in word:
                        print(f"Image word '{word}' matches keyword '{kw}' for category '{category}' - accepting")
                        return True
                for lbl in allowed_labels:
                    if word in lbl or lbl in word:
                        print(f"Image word '{word}' matches label '{lbl}' for category '{category}' - accepting")
                        return True

        # If none of the methods match, the image is clearly unrelated
        print(f"Image label '{image_label}' does NOT match category '{category}' - rejecting")
        return False

    except Exception as e:
        # If classification fails completely, REJECT (don't allow unknown)
        print(f"Image classification error for category '{category}' - rejecting: {str(e)}")
        return False


# ------------------------------------
# Reject helper
# ------------------------------------
def reject(report, reason, category="Other", confidence=0.0, validation=None):
    result = {
        "report_id": report.get("report_id", "unknown"),
        "accept": False,
        "accepted": False,
        "status": "rejected",
        "category": category,
        "confidence": round(confidence, 2),  # Include confidence in rejection
        "reason": reason
    }
    if validation:
        result["validation"] = validation
    # Remove image_bytes from report data before saving (can't serialize bytes to JSON)
    report_for_save = {**report, **result}
    if "image_bytes" in report_for_save:
        # Remove image_bytes - we only need image_hash for duplicate checking
        del report_for_save["image_bytes"]
    
    try:
        dataset.save_report(report_for_save)
        print(f"[DEBUG] Successfully saved rejected report to dataset")
    except Exception as e:
        print(f"[ERROR] Failed to save rejected report to dataset (non-critical): {str(e)}")
        import traceback
        print(traceback.format_exc())
        # Continue - dataset save failure shouldn't block rejection response
    return result
