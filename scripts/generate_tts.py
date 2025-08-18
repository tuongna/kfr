import os
import json
from gtts import gTTS

# Input JSON files containing vocabulary and sentences
INPUT_FILES = ["data/vocab.json", "data/sentences.json"]

# Directory to save generated audio files
OUTPUT_DIR = "audio"

def load_json(path):
    """
    Load a list of dictionaries from a JSON file.
    """
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def shorten_rr(rr: str) -> str:
    """
    Shorten the romanized word (RR) if it's longer than 20 characters.
    Follows a similar logic to the JavaScript genIdFromRR function.
    """
    rr = rr.replace(" ", "_")  # replace spaces with underscores
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

def main():
    # Make sure the output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Loop through both input files
    for input_file in INPUT_FILES:
        items = load_json(input_file)
        print(f"Processing {input_file} ({len(items)} items)...")
        
        for i, item in enumerate(items, start=1):
            # Use 'rr' field if available, otherwise fallback to first 20 chars of 'ko'
            rr_name = item.get("rr", item.get("ko", ""))
            word_rr = shorten_rr(rr_name).lower()
            filename = os.path.join(OUTPUT_DIR, f"{word_rr}.mp3")

            try:
                generate_tts(item["ko"], filename, lang="ko")
                print(f"✅ Saved: {filename}")
            except Exception as e:
                print(f"❌ Error with {word_rr}: {e}")

if __name__ == "__main__":
    main()
