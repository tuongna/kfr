import os
import json
from gtts import gTTS

INPUT_FILE = "data/vocab.json"
OUTPUT_DIR = "audio"

def load_vocab(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_tts(word, filename, lang="ko"):
    tts = gTTS(text=word, lang=lang)
    tts.save(filename)

def main():
    vocab_list = load_vocab(INPUT_FILE)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for i, item in enumerate(vocab_list, start=1):
        word_rr = item["rr"].replace(" ", "_").lower()
        filename = os.path.join(OUTPUT_DIR, f"{word_rr}.mp3")

        try:
            generate_tts(item["ko"], filename, lang="ko")
            print(f"✅ Saved: {filename}")
        except Exception as e:
            print(f"❌ Error with {word_rr}: {e}")

if __name__ == "__main__":
    main()
