# Quiz Import Prompt — tích lũy câu hỏi Scrum Open

## Chiến lược: 1 file seed tích lũy

Dự án duy trì **một file seed master** (`supabase/seed_scrum_open_master.sql`)
chứa TẤT CẢ câu hỏi Scrum Open Assessment duy nhất (không trùng lặp).

- Mỗi câu hỏi được nhận diện bởi **stem** (nội dung câu hỏi) — đây là khoá tự nhiên.
- Câu hỏi xuất hiện ở nhiều phiên crawl → chỉ giữ **1 bản**, tags gộp cả hai pool.
- Mỗi câu hỏi có UUID tĩnh cố định — đảm bảo SRS progress không bị mất khi chạy lại seed.
- File seed master: idempotent — chạy lại bất cứ lúc nào đều an toàn.

## Quy trình thêm câu hỏi mới (2 bước)

**Bước 1 — Chuẩn bị input cho AI:**

```
[PHẦN 1] Nội dung file seed hiện tại (supabase/seed_scrum_open_master.sql)
[PHẦN 2] Dữ liệu crawl mới (markdown từ Scrum.org)
```

**Bước 2 — Paste vào AI, nhận về file seed mới:**

1. Mở session AI mới (Claude/GPT/Gemini).
2. Paste **toàn bộ prompt template** bên dưới.
3. Paste nội dung **file seed hiện tại** vào sau `<<CURRENT_SEED_START>>`.
4. Paste **markdown crawl mới** vào sau `<<NEW_CRAWL_START>>`.
5. AI trả về file SQL. Lưu đè lên `supabase/seed_scrum_open_master.sql`.
6. Paste vào Supabase SQL Editor → chạy.

> **Lần đầu tiên** (chưa có master seed): bỏ qua PHẦN 1, chỉ paste PHẦN 2.
> AI sẽ tạo file master mới hoàn toàn.

---

## Prompt template (copy toàn bộ vào AI)

```
You are maintaining a cumulative PostgreSQL seed file for the KfR Scrum
learning app. Your task:

1. Parse the CURRENT SEED (between <<CURRENT_SEED_START>> and <<CURRENT_SEED_END>>)
   to extract all existing questions — each with its UUID, stem, and tags.
2. Parse the NEW CRAWL DATA (between <<NEW_CRAWL_START>> and <<NEW_CRAWL_END>>)
   to extract new questions.
3. Merge: if a new question's stem already exists in the current seed, SKIP the
   new question (keep the existing record, possibly adding the new pool tag to it).
   If the stem is genuinely new, add it with a freshly generated static UUID.
4. Output a single NEW ACCUMULATED SEED FILE that contains all unique questions
   (old + new), following the template below exactly.

# DEDUPLICATION RULE
Stems are compared case-insensitively after stripping leading/trailing whitespace.
If the crawl produces a question with the exact same or near-identical stem as an
existing one, keep the EXISTING UUID and merge the tags (union both tag sets).

# UUID RULE
- PRESERVE all UUIDs from the current seed unchanged.
- For each NEW question (not in current seed), generate ONE static UUID using:
    python3 -c "import uuid; print(uuid.uuid4())"
  Hardcode the result — never use gen_random_uuid() for question IDs.
- question_options may still use gen_random_uuid().

# INPUT FORMAT (NEW CRAWL DATA)
The markdown contains 20-30 numbered questions. Each question looks like:

    Question N of M

    <stem text>

    **(choose the best answer)**          <-- single-correct (4 options A-D/E)
    **(choose the best two answers)**     <-- multi-select, 2 correct
    **(choose the best three answers)**   <-- multi-select, 3 correct
    **True or False:** <stem>             <-- T/F, 2 options

    A. <option text>
    B. <option text>
    C. <option text>
    D. <option text>

    Feedback
    <explanation paragraph — read this to determine correct answer(s)>

# OUTPUT REQUIREMENTS

Produce a single SQL file. Do NOT include markdown fences.
The file MUST start with `-- Scrum Open Assessment — master seed` and end with
`END $$;`.

## Schema constraints

- Table `public.questions` columns: id, exam, stem, explanation_en,
  explanation_vi, tags (text[]), term_refs (uuid[]), source, quality, owner_id.
- Table `public.question_options` columns: id, question_id, text, correct,
  sort_order.
- `exam` is 'PSM-I' for Scrum Open, 'PSPO-I' for PSPO Open.
- `quality` is always 'trusted'.
- `source` is always 'Scrum Open Assessment'.
- `owner_id` is omitted (NULL — shared/public question under RLS).

## Pool tag for new questions

Ask the user: "Which pool tag for the new questions? (e.g., scrum-open-pool-4)"
Every NEW question must have that tag in its `tags` array.
Existing questions keep their existing tags (and gain the new pool tag if the
stem matched a duplicate).

## Translation rules

- `explanation_en` = Feedback paragraph, lightly edited for clarity (1-3 sentences).
- `explanation_vi` = Vietnamese translation.
- Keep in English: Scrum, Sprint, Sprint Goal, Product Owner, Scrum Master,
  Developers, Product Backlog, Sprint Backlog, Increment, Definition of Done,
  Daily Scrum, Sprint Planning, Sprint Review, Sprint Retrospective, Product
  Goal, Scrum Team, Scrum Guide.

## Correctness extraction

- Single-correct: one option matches the Feedback.
- Multi-select: N options where N = "two"/"three" from the header.
- T/F: Feedback states which is correct.
- Ambiguous? Add `-- TODO: verify correct answer` next to the option.

## Tags

Per question: 2-4 topic tags + the pool tag as LAST element. e.g.:
  ARRAY['sprint-planning', 'timebox', 'scrum-open-pool-4']
Use kebab-case. Include 'multi-select' for choose-2/3 and 'true-false' for T/F.

## SQL escaping

- Single quotes inside text → double them: `Sprint's` → `Sprint''s`.
- Empty term_refs: `'{}'::uuid[]`.
- Tag arrays: `ARRAY['a', 'b']` syntax.

## File template (FILL IN THE BLANKS)

    -- Scrum Open Assessment — master seed ({{TOTAL}} questions, PSM-I)
    -- Accumulated from pools: {{POOL_LIST}}
    -- Idempotent: DELETE then INSERT. Re-running is safe.
    -- ⚠️  Personal study use only — access restricted by RLS to owner account.

    DELETE FROM public.questions
      WHERE source = 'Scrum Open Assessment'
        AND owner_id IS NULL;

    DO $$ DECLARE
      -- Static UUIDs — preserved from previous runs so SRS progress is not lost.
      q1   uuid := '{{UUID_1}}';
      q2   uuid := '{{UUID_2}}';
      ...
      q{{N}} uuid := '{{UUID_N}}';
    BEGIN

      INSERT INTO public.questions
        (id, exam, stem, explanation_en, explanation_vi, tags, term_refs, source, quality)
      VALUES
        (q1, 'PSM-I', '{{STEM_1}}', '{{EN_1}}', '{{VI_1}}',
         ARRAY[{{TOPIC_TAGS_1}}, '{{POOL_TAG_1}}'], '{}'::uuid[],
         'Scrum Open Assessment', 'trusted'),

        -- ... (last row ends with `);` not `,`)

      -- Q1: <short label>
      INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
        (gen_random_uuid(), q1, '{{OPT_A}}', {{true|false}}, 0),
        (gen_random_uuid(), q1, '{{OPT_B}}', {{true|false}}, 1),
        ...;

      -- Q2 ... and so on

    END $$;

# YOUR TASK

Below you will find:
  PART 1 — the current accumulated seed (may be empty on first run)
  PART 2 — the new crawl data to merge in

Merge them into one new accumulated seed following ALL rules above.
Return ONLY the SQL — no explanation, no markdown fences, no preamble.

<<CURRENT_SEED_START>>
[PASTE CONTENT OF supabase/seed_scrum_open_master.sql HERE]
<<CURRENT_SEED_END>>

<<NEW_CRAWL_START>>
[PASTE NEW CRAWLED MARKDOWN HERE]
<<NEW_CRAWL_END>>
```

---

## Post-generation checklist

Sau khi AI trả file, làm 5 việc:

1. **Đếm câu**: số `(q1,` `(q2,` … phải = số `q{N} uuid := ` trong DECLARE.
2. **Đếm correct**: tổng `, true,` = (single) × 1 + (multi-2) × 2 + (multi-3) × 3.
3. **Multi-select sanity**: câu "choose N answers" → đúng N `true` trong options block.
4. **T/F sanity**: T/F → 2 options (`True`/`False`), 1 correct.
5. **UUID sanity**: không có `gen_random_uuid()` trong phần questions INSERT
   (chỉ cho phép ở question_options).

## Common failure modes

- **Quote không escape**: AI quên double single quote → SQL parse error.
  Prompt phụ: "Re-emit, ensuring all single quotes inside strings are doubled."
- **Multi-select đếm sai**: AI chọn 3 cho câu choose-2.
  Prompt phụ: "Re-check Q{N}: header says choose {N} but you marked {M} correct."
- **Quên tag pool**: Prompt phụ: "Every NEW question must have '{{POOL_TAG}}' as
  last tag. Existing questions keep their existing tags."
- **Dịch cả "Scrum"/"Sprint"**: Prompt phụ: "Keep Scrum terminology in English."
- **Mất UUID cũ**: AI generate UUID mới thay vì giữ nguyên.
  Prompt phụ: "Preserve all UUIDs from the CURRENT SEED exactly as-is."
