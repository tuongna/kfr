import json
import os
from gtts import gTTS
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor
from pydub import AudioSegment

# --- Folders ---
AUDIO_DIR = '../audio/'  # output 64kbps
DATA_FILE = '../data/sentences.json'
MAX_THREADS = 8  # number of parallel threads

# --- Ensure folders exist ---
os.makedirs(AUDIO_DIR, exist_ok=True)

# --- Load JSON data ---
with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data_list = json.load(f)

def generate_audio(item):
    kor_id = item['id']
    kor_text = item['ko']

    audio_path = os.path.join(AUDIO_DIR, f"{kor_id}.mp3")

    # Skip if already exists
    if os.path.exists(audio_path):
        return

    # Generate gTTS MP3
    tts = gTTS(text=kor_text, lang='ko')
    tts.save(audio_path)

    # Convert to 64kbps using pydub/ffmpeg
    sound = AudioSegment.from_file(audio_path, format="mp3")
    sound.export(audio_path, format="mp3", bitrate="64k")

# --- Multi-threaded generation ---
print("Generating audio (multi-threaded, 64kbps)...")
with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
    list(tqdm(executor.map(generate_audio, data_list), total=len(data_list)))

print("Audio generation completed! Low-bitrate files in 'audio/'")
