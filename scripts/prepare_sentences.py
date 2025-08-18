import pandas as pd
import json
import os
from tqdm import tqdm

# --- Folders ---
RAW_DIR = '../data/raw/'
AUDIO_DIR = '../audio/'
OUTPUT_DIR = '../data/'

# --- Load raw data ---
print("Loading raw data...")
kor_sentences = pd.read_csv(
    f'{RAW_DIR}/kor_sentences.tsv', sep='\t', header=None, names=['id','lang','text']
)
eng_sentences = pd.read_csv(
    f'{RAW_DIR}/eng_sentences.tsv', sep='\t', header=None, names=['id','lang','text']
)
vie_sentences = pd.read_csv(
    f'{RAW_DIR}/vie_sentences.tsv', sep='\t', header=None, names=['id','lang','text']
)
links = pd.read_csv(
    f'{RAW_DIR}/links.csv', sep='\t', header=None, names=['from_sentence_id','to_sentence_id']
)

print(f"Loaded {len(kor_sentences)} Korean, {len(eng_sentences)} English, {len(vie_sentences)} Vietnamese sentences")
print(f"Total links: {len(links)}")

# --- Merge links with sentences ---
print("Merging data...")
links_kor = links.merge(kor_sentences[['id','text']], left_on='from_sentence_id', right_on='id')
links_kor = links_kor.rename(columns={'text':'ko'}).drop(columns=['id'])

# Merge English
links_kor = links_kor.merge(eng_sentences[['id','text']], left_on='to_sentence_id', right_on='id', how='left')
links_kor = links_kor.rename(columns={'text':'en'}).drop(columns=['id'])

# Merge Vietnamese
links_kor = links_kor.merge(vie_sentences[['id','text']], left_on='to_sentence_id', right_on='id', how='left')
links_kor = links_kor.rename(columns={'text':'vi'}).drop(columns=['id'])

# --- Group translations by Korean sentence ---
print("Grouping translations (only Korean sentences with at least one translation)...")
data_dict = {}
for _, row in tqdm(links_kor.iterrows(), total=len(links_kor), desc="Grouping"):
    kor_id = row['from_sentence_id']

    # Skip Korean sentence if neither English nor Vietnamese exists
    if pd.isna(row['en']) and pd.isna(row['vi']):
        continue

    if kor_id not in data_dict:
        data_dict[kor_id] = {
            "id": int(kor_id),
            "ko": row['ko'],
            "en": [],
            "vi": [],
            "audio": f'audio/{kor_id}.mp3',
            "level": "",
            "tags": []
        }

    # Append translations if exist and not duplicate
    if pd.notna(row['en']) and row['en'] not in data_dict[kor_id]['en']:
        data_dict[kor_id]['en'].append(row['en'])
    if pd.notna(row['vi']) and row['vi'] not in data_dict[kor_id]['vi']:
        data_dict[kor_id]['vi'].append(row['vi'])

# --- Prepare final JSON list ---
data_list = list(data_dict.values())

# --- Ensure output folder exists ---
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Save JSON ---
output_file = os.path.join(OUTPUT_DIR, 'sentences.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data_list, f, ensure_ascii=False, indent=2)

print(f"JSON created with {len(data_list)} Korean sentences. Audio files should be in '{AUDIO_DIR}'.")
