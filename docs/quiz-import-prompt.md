# Quiz Import Prompt — tích lũy câu hỏi Scrum Open

## Chiến lược: master seed = chuỗi block theo pool, AI chỉ phát ra phần MỚI

Dự án duy trì **một file seed master** (`supabase/seed_scrum_open_master.sql`)
chứa TẤT CẢ câu hỏi Scrum Open Assessment duy nhất (không trùng lặp).

File master là **chuỗi các block độc lập** — mỗi lần crawl/pool thêm vào một block
`DO $$ … END $$;` riêng. Mỗi block:

- Chỉ thao tác trên **UUID của câu mới trong pool đó** (scoped DELETE rồi INSERT) —
  **không bao giờ động tới câu hỏi cũ**.
- Idempotent: chạy lại cả file hay chạy lại một block đều an toàn.
- Vì `progress.item_id` không phải khoá ngoại tới `questions`, xoá-rồi-chèn-lại với
  **cùng UUID tĩnh** không làm mất SRS progress.

Nguyên tắc nhận diện trùng vẫn theo **stem** (nội dung câu hỏi) — khoá tự nhiên.

> **Điểm tối ưu chính:** AI **đọc** toàn bộ seed hiện tại (để biết stem nào đã có),
> nhưng chỉ **xuất ra một block nhỏ gồm các câu MỚI đã loại trùng** — không in lại
> toàn bộ câu cũ. Output ngắn hơn rất nhiều.

> **⚠️ Bản quyền — file seed KHÔNG nằm trong repo.** Nội dung là tài liệu
> Scrum Open Assessment có bản quyền, nên `.gitignore` đã loại `supabase/seed*.sql`.
> Bạn **giữ file master ở máy local**, không commit. Đường dẫn
> `supabase/seed_scrum_open_master.sql` ở đây chỉ là quy ước vị trí local.
>
> Trạng thái hiện tại: master có **75 câu** (pools 1–4). Pool kế tiếp là **pool-5**.

## Quy trình thêm câu hỏi mới (2 bước)

**Bước 1 — Chuẩn bị input cho AI:**

```
[PHẦN 1] Nội dung file seed hiện tại (supabase/seed_scrum_open_master.sql) — để dedup
[PHẦN 2] Dữ liệu crawl mới (markdown từ Scrum.org)
```

**Bước 2 — Paste vào AI, nhận về MỘT block SQL của câu mới:**

1. Mở session AI mới (Claude/GPT/Gemini).
2. Paste **toàn bộ prompt template** bên dưới.
3. Paste nội dung **file seed hiện tại** vào sau `<<CURRENT_SEED_START>>`.
4. Paste **markdown crawl mới** vào sau `<<NEW_CRAWL_START>>`.
5. AI trả về **một block SQL chỉ gồm câu mới** (đã loại trùng). **Append** block đó
   vào CUỐI `supabase/seed_scrum_open_master.sql`.
6. Paste **block đó** vào Supabase SQL Editor → chạy (chỉ cần chạy block mới).

> **Lần đầu tiên** (chưa có master seed): bỏ qua PHẦN 1, chỉ paste PHẦN 2.
> AI sẽ tạo block đầu tiên — đó cũng chính là nội dung file master mới.

> **Tương thích với master cũ (monolithic):** master hiện tại bắt đầu bằng một
> `DELETE … WHERE source = 'Scrum Open Assessment'` rồi chèn lại toàn bộ 75 câu
> trong một block. Block scoped mới chỉ cần **append vào cuối** và vẫn an toàn:
> chạy riêng block mới → chỉ đụng UUID mới; chạy lại cả file → global DELETE xoá
> sạch, block cũ chèn 1–75, block mới chèn phần còn lại. Không cần sửa master cũ.

---

## Prompt template (copy toàn bộ vào AI)

```
You are maintaining a cumulative PostgreSQL seed file for the KfR Scrum
learning app. The seed file is a sequence of independent, idempotent blocks
(one per crawl pool). Your task is to EMIT ONLY ONE NEW BLOCK containing the
genuinely-new questions from the new crawl — do NOT re-emit existing questions.

1. Parse the CURRENT SEED (between <<CURRENT_SEED_START>> and <<CURRENT_SEED_END>>)
   to learn which stems ALREADY EXIST and their UUIDs/tags. You read this only
   to deduplicate — you will NOT output any of these existing questions again.
2. Parse the NEW CRAWL DATA (between <<NEW_CRAWL_START>> and <<NEW_CRAWL_END>>).
3. Deduplicate: for each crawl question whose stem already exists in the current
   seed, SKIP it (do not insert). For each genuinely NEW stem, include it.
4. Output a SINGLE new SQL block containing ONLY the new (deduplicated)
   questions, following the block template below exactly.

# DEDUPLICATION RULE
Stems are compared case-insensitively after stripping leading/trailing whitespace.
A crawl question whose stem matches (exactly or near-identically) an existing one
is a DUPLICATE → do NOT insert it. Optionally emit a one-line tag-merge UPDATE for
it (see template) so the existing record also carries the new pool tag.

# UUID RULE
- For each NEW question, generate ONE static UUID using:
    python3 -c "import uuid; print(uuid.uuid4())"
  Hardcode the result — never use gen_random_uuid() for question IDs.
- Do NOT reuse or restate UUIDs of existing questions (except in an optional
  tag-merge UPDATE that references an existing UUID).
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

Produce a SINGLE SQL block (one `DO $$ … END $$;`). Do NOT include markdown fences.
The block MUST start with `-- Scrum Open Assessment — pool` and end with `END $$;`.
It MUST contain ONLY the new (deduplicated) questions — no existing questions,
no global DELETE of the whole table.

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

Ask the user: "Which pool tag for the new questions? (e.g., scrum-open-pool-5)"
Every NEW question must have that tag as the LAST element of its `tags` array.

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
  ARRAY['sprint-planning', 'timebox', 'scrum-open-pool-5']
Use kebab-case. Include 'multi-select' for choose-2/3 and 'true-false' for T/F.

## SQL escaping

- Single quotes inside text → double them: `Sprint's` → `Sprint''s`.
- Empty term_refs: `'{}'::uuid[]`.
- Tag arrays: `ARRAY['a', 'b']` syntax.

## Block template (FILL IN THE BLANKS — emit ONLY the new questions)

    -- Scrum Open Assessment — pool {{POOL_TAG}} ({{NEW_COUNT}} new questions, PSM-I)
    -- Incremental block: scoped DELETE+INSERT by UUID. Re-running is safe.
    -- Existing questions are never touched → SRS progress preserved.
    -- ⚠️  Personal study use only — access restricted by RLS to owner account.

    DO $$ DECLARE
      -- Static UUIDs for the NEW questions in this pool only.
      q1   uuid := '{{UUID_1}}';
      q2   uuid := '{{UUID_2}}';
      ...
      q{{N}} uuid := '{{UUID_N}}';
    BEGIN

      -- Scoped cleanup: ONLY the new UUIDs (options cascade). Existing rows untouched.
      DELETE FROM public.questions WHERE id IN (q1, q2, ..., q{{N}});

      -- ────── Questions ──────
      INSERT INTO public.questions
        (id, exam, stem, explanation_en, explanation_vi, tags, term_refs, source, quality)
      VALUES
        (q1, 'PSM-I', '{{STEM_1}}', '{{EN_1}}', '{{VI_1}}',
         ARRAY[{{TOPIC_TAGS_1}}, '{{POOL_TAG}}'], '{}'::uuid[],
         'Scrum Open Assessment', 'trusted'),

        -- ... (last row ends with `);` not `,`)

      -- ────── Options ──────
      -- Q1
      INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
        (gen_random_uuid(), q1, '{{OPT_A}}', {{true|false}}, 0),
        (gen_random_uuid(), q1, '{{OPT_B}}', {{true|false}}, 1),
        ...;

      -- Q2 ... and so on

      -- OPTIONAL — duplicates (skipped above): merge the pool tag into the existing
      -- record. One line per duplicate; idempotent. Omit if there are no duplicates.
      UPDATE public.questions SET tags = array_append(tags, '{{POOL_TAG}}')
        WHERE id = '{{EXISTING_UUID}}' AND NOT ('{{POOL_TAG}}' = ANY(tags));

    END $$;

# YOUR TASK

Below you will find:
  PART 1 — the current accumulated seed (may be empty on first run; read only to dedup)
  PART 2 — the new crawl data

Emit ONE new block containing ONLY the new (deduplicated) questions, following ALL
rules above. Return ONLY that SQL block — no explanation, no markdown fences, no
preamble, and no existing questions.

<<CURRENT_SEED_START>>
[PASTE CONTENT OF supabase/seed_scrum_open_master.sql HERE]
<<CURRENT_SEED_END>>

<<NEW_CRAWL_START>>
[PASTE NEW CRAWLED MARKDOWN HERE]
<<NEW_CRAWL_END>>
```

---

## Post-generation checklist

Sau khi AI trả block, làm 6 việc (đều tính trên BLOCK MỚI):

1. **Không lặp lại câu cũ**: block chỉ chứa stem MỚI; không có stem nào đã có trong
   seed hiện tại (trừ dòng UPDATE tag-merge tùy chọn).
2. **Đếm câu**: số `(q1,` `(q2,` … phải = số `q{N} uuid := ` trong DECLARE
   và = số UUID trong `DELETE … WHERE id IN (…)`.
3. **Đếm correct**: tổng `, true,` = (single) × 1 + (multi-2) × 2 + (multi-3) × 3.
4. **Multi-select sanity**: câu "choose N answers" → đúng N `true` trong options block.
5. **T/F sanity**: T/F → 2 options (`True`/`False`), 1 correct.
6. **UUID sanity**: không có `gen_random_uuid()` trong phần questions INSERT
   (chỉ cho phép ở question_options); không có global DELETE toàn bảng.

## Common failure modes

- **In lại toàn bộ câu cũ**: AI xuất cả seed thay vì chỉ block mới.
  Prompt phụ: "Output ONLY the new deduplicated questions as one block — do not
  re-emit any existing question."
- **Global DELETE**: AI thêm `DELETE … WHERE source = …` xoá cả bảng.
  Prompt phụ: "Delete only the new UUIDs via `WHERE id IN (…)`; never delete by source."
- **Quote không escape**: AI quên double single quote → SQL parse error.
  Prompt phụ: "Re-emit, ensuring all single quotes inside strings are doubled."
- **Multi-select đếm sai**: AI chọn 3 cho câu choose-2.
  Prompt phụ: "Re-check Q{N}: header says choose {N} but you marked {M} correct."
- **Quên tag pool**: Prompt phụ: "Every NEW question must have '{{POOL_TAG}}' as
  last tag."
- **Dịch cả "Scrum"/"Sprint"**: Prompt phụ: "Keep Scrum terminology in English."
- **Bỏ sót dedup**: AI chèn lại câu đã có. Prompt phụ: "Q{N} stem already exists in
  the current seed — drop it from the INSERT."
