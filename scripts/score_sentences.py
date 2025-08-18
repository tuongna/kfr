import csv
from collections import Counter

NGRAM_SIZES = [2, 3]   # 2-gram, 3-gram ký tự
TOP_SENTENCES = 100
RAW_DIR = '../data/raw/'
OUTPUT_FILE = RAW_DIR + 'top_kor_sentences.tsv'
CORE_VOCAB = set(["하다", "있다", "되다"])  # ví dụ core vocab
WEIGHT_CORE = 2  # trọng số core vocab

# --- Load sentences with IDs ---
sentences = []
ids = []
with open(RAW_DIR + 'kor_sentences.tsv', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter='\t')
    for row in reader:
        if row:
            ids.append(int(row[0]))
            sentences.append(row[2] if len(row) > 2 else row[0])  # nếu file có 3 cột, cột text là thứ 3

# --- Count character n-grams ---
def get_ngrams(text, n):
    return [text[i:i+n] for i in range(len(text)-n+1)]

ngram_freq = Counter()
for sentence in sentences:
    for n in NGRAM_SIZES:
        ngram_freq.update(get_ngrams(sentence, n))

# --- Score sentences ---
scored_sentences = []
for sid, sentence in zip(ids, sentences):
    # n-gram score
    ngram_score = sum(ngram_freq[ng] for n in NGRAM_SIZES for ng in get_ngrams(sentence, n))
    # chuẩn hóa theo độ dài n-grams
    num_ngrams = sum(len(get_ngrams(sentence, n)) for n in NGRAM_SIZES)
    ngram_score = ngram_score / num_ngrams if num_ngrams else 0

    # core vocab ratio
    words = sentence.split()
    core_ratio = sum(1 for w in words if w in CORE_VOCAB) / len(words) if words else 0

    # tổng score
    total_score = ngram_score + WEIGHT_CORE * core_ratio
    scored_sentences.append((sid, total_score))

# --- Select top sentences ---
top_sentences = sorted(scored_sentences, key=lambda x: x[1], reverse=True)[:TOP_SENTENCES]

# --- Write to TSV: ID and score ---
with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f, delimiter='\t')
    for sid, score in top_sentences:
        writer.writerow([sid, round(score, 4)])

print(f"Top {TOP_SENTENCES} sentences saved to {OUTPUT_FILE}")
