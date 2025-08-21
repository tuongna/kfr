import os
import json
from gtts import gTTS

# --- Paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RESOURCES_DIR = os.path.join(SCRIPT_DIR, "..", "data")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "assets", "audio")

INPUT_FILES = [
    os.path.join(RESOURCES_DIR, "vocab.json"),
    os.path.join(RESOURCES_DIR, "sentences.json")
]

# --- Functions ---
def load_json(path):
    """
    Load a list of dictionaries from a JSON file.
    """
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def shorten_rr(rr: str) -> str:
    """
    Shorten the romanized word (Phiên âm) if it's longer than 20 characters.
    Similar logic to JS genIdFromRR function.
    """
    rr = rr.replace(" ", "_")
    if len(rr) <= 20:
        return rr
    extra = len(rr) - 16
    extra_str = str(extra).zfill(4)
    return rr[:8] + extra_str + rr[12:20]

def generate_tts(word, filename, lang="ko"):
    """
    Generate a TTS audio file for the given word or sentence.
    """
    tts = gTTS(text=word, lang=lang)
    tts.save(filename)

# --- Main ---
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for input_file in INPUT_FILES:
        if not os.path.exists(input_file):
            print(f"❌ File not found: {input_file}")
            continue

        items = load_json(input_file)
        print(f"Processing {input_file} ({len(items)} items)...")

        for i, item in enumerate(items, start=1):
            rr_name = item.get("rr", item.get("ko", ""))
            word_rr = shorten_rr(rr_name).lower()
            filename = os.path.join(OUTPUT_DIR, f"{word_rr}.mp3")

            if os.path.exists(filename):
                print(f"⏩ Skipped (exists): {filename}")
                continue

            try:
                generate_tts(item["ko"], filename, lang="ko")
                print(f"✅ Saved: {filename}")
            except Exception as e:
                print(f"❌ Error with {word_rr}: {e}")

if __name__ == "__main__":
    main()
