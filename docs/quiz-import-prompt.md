# Quiz Import Prompt — markdown crawl → seed SQL

Mục đích: cho phép AI bất kỳ (Claude, GPT, Gemini…) convert markdown crawl từ
[Scrum.org Open Assessment](https://www.scrum.org/open-assessments) sang file
seed SQL theo schema của repo này.

## Cách dùng (3 bước)

1. Crawl xong → có 1 block markdown chứa ~30 câu hỏi (xem mẫu input bên dưới).
2. Mở session AI mới → paste **toàn bộ prompt template** ở dưới → paste markdown
   của bạn sau dòng `<<INPUT_START>>`.
3. AI trả về 1 file SQL. Lưu vào `supabase/seed_scrum_open_vN.sql` (N = pool
   number tiếp theo) → paste vào Supabase SQL Editor.

Nếu DB đã có migration `006_unique_question_stem.sql`, INSERT trùng stem sẽ
fail loud → bạn biết câu nào trùng, gỡ khỏi seed mới rồi chạy lại.

---

## Prompt template (copy toàn bộ vào AI)

```
You are converting a raw markdown dump from scrum.org Open Assessment into a
PostgreSQL seed file for the KfR Scrum learning app.

# INPUT FORMAT
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

Produce a single SQL file. Do NOT include markdown fences in the output —
the file must start with `-- Scrum Open Assessment ...` and end with `END $$;`.

## Schema constraints

- Table `public.questions` columns: id, exam, stem, explanation_en,
  explanation_vi, tags (text[]), term_refs (uuid[]), source, quality, owner_id.
- Table `public.question_options` columns: id, question_id, text, correct,
  sort_order.
- `exam` MUST be 'PSM-I' (or 'PSPO-I' if the source is PSPO Open).
- `quality` is always 'trusted' for scrum.org content.
- `source` is always 'Scrum Open Assessment'.
- `owner_id` is omitted (defaults to NULL → public/shared question).
- Every question MUST be tagged with the pool tag (see below).

## Pool tag

Ask the user: "Which pool tag should I use? (e.g., scrum-open-pool-3)"
Default to `scrum-open-pool-3` if no answer. Put this tag in EVERY
question's `tags` array as the LAST element.

## Translation rules

- `explanation_en` is the feedback paragraph, lightly edited for clarity
  (1-3 sentences).
- `explanation_vi` is a Vietnamese translation of the feedback.
- Keep these terms in English (don't translate): Scrum, Sprint, Sprint Goal,
  Product Owner, Scrum Master, Developers, Product Backlog, Sprint Backlog,
  Increment, Definition of Done, Daily Scrum, Sprint Planning, Sprint Review,
  Sprint Retrospective, Product Goal, Scrum Team, Scrum Guide.
- Translate normal English (verbs, connectors, adjectives) into Vietnamese.

## Correctness extraction

Read the Feedback paragraph carefully:
- Single-correct: identify the one option that matches the feedback.
- Multi-select: identify N options where N = "two"/"three" from the header.
- T/F: feedback states which answer is correct.
- If feedback is ambiguous, ADD a comment `-- TODO: verify correct answer`
  next to the option.

## Tags

In addition to the pool tag, add 2-4 topic tags per question, e.g.:
  ['sprint-planning', 'timebox', 'scrum-open-pool-3']
  ['scrum-master', 'daily-scrum', 'scrum-open-pool-3']
  ['true-false', 'product-backlog', 'scrum-open-pool-3']
Use kebab-case. Always include `'multi-select'` for choose-2/3 questions
and `'true-false'` for T/F questions.

## SQL escaping

- Single quotes inside text → double them: `Sprint's` → `Sprint''s`.
- Empty term_refs is `'{}'::uuid[]`.
- Tag arrays use `ARRAY['a', 'b']` syntax.

## File template (FILL IN THE BLANKS — DO NOT change structure)

    -- Scrum Open Assessment — Pool {{N}} ({{COUNT}} questions, {{EXAM}})
    -- Idempotent: re-running this file removes Pool {{N}} questions (by tag)
    -- and re-inserts. Other pools are NOT affected.
    -- Run via Supabase SQL Editor or `psql -f`.

    DELETE FROM public.questions
      WHERE source = 'Scrum Open Assessment'
        AND owner_id IS NULL
        AND 'scrum-open-pool-{{N}}' = ANY(tags);

    DO $$ DECLARE
      q1  uuid; q2  uuid; q3  uuid; ... q{{COUNT}} uuid;
    BEGIN
      q1  := gen_random_uuid(); q2  := gen_random_uuid(); ...

      -- ────── Questions ──────
      INSERT INTO public.questions
        (id, exam, stem, explanation_en, explanation_vi, tags, term_refs, source, quality)
      VALUES
        -- 1
        (q1, '{{EXAM}}',
         '{{STEM_1}}',
         '{{EXPLAIN_EN_1}}',
         '{{EXPLAIN_VI_1}}',
         ARRAY[{{TAGS_1}}, 'scrum-open-pool-{{N}}'], '{}'::uuid[],
         'Scrum Open Assessment', 'trusted'),

        -- 2 ... and so on until question {{COUNT}}, last row ends with `);`

      -- ────── Options ──────

      -- Q1: <short label>
      INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
        (gen_random_uuid(), q1, '{{OPT_1A}}', {{TRUE_OR_FALSE}}, 0),
        (gen_random_uuid(), q1, '{{OPT_1B}}', {{TRUE_OR_FALSE}}, 1),
        ...;

      -- Q2 ... and so on

    END $$;

# WORKED EXAMPLE (input → output, abbreviated to 2 questions)

INPUT:
    Question 1 of 2

    What is the maximum length of a Sprint?

    **(choose the best answer)**

    A. Two weeks
    B. One month
    C. Six weeks
    D. There is no maximum

    Feedback
    The Scrum Guide states Sprints are one month or less.

    Question 2 of 2

    **True or False:** Scrum has a role called "project manager."

    Feedback
    A Scrum Team has a Scrum Master, a Product Owner and Developers. There
    is no project manager role.

OUTPUT (pool 9, exam PSM-I):

    -- Scrum Open Assessment — Pool 9 (2 questions, PSM-I)
    -- ... [header comments] ...

    DELETE FROM public.questions
      WHERE source = 'Scrum Open Assessment'
        AND owner_id IS NULL
        AND 'scrum-open-pool-9' = ANY(tags);

    DO $$ DECLARE
      q1 uuid; q2 uuid;
    BEGIN
      q1 := gen_random_uuid(); q2 := gen_random_uuid();

      INSERT INTO public.questions
        (id, exam, stem, explanation_en, explanation_vi, tags, term_refs, source, quality)
      VALUES
        (q1, 'PSM-I',
         'What is the maximum length of a Sprint?',
         'The Scrum Guide states Sprints are one month or less.',
         'Scrum Guide quy định Sprint có thời gian tối đa là một tháng.',
         ARRAY['sprint', 'timebox', 'scrum-open-pool-9'], '{}'::uuid[],
         'Scrum Open Assessment', 'trusted'),

        (q2, 'PSM-I',
         'True or False: Scrum has a role called "project manager."',
         'A Scrum Team has a Scrum Master, a Product Owner and Developers. There is no project manager role.',
         'Scrum Team gồm Scrum Master, Product Owner và Developers. Không có vai trò project manager.',
         ARRAY['true-false', 'roles', 'scrum-open-pool-9'], '{}'::uuid[],
         'Scrum Open Assessment', 'trusted');

      -- Q1: Sprint length
      INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
        (gen_random_uuid(), q1, 'Two weeks', false, 0),
        (gen_random_uuid(), q1, 'One month', true, 1),
        (gen_random_uuid(), q1, 'Six weeks', false, 2),
        (gen_random_uuid(), q1, 'There is no maximum', false, 3);

      -- Q2: Scrum has project manager (T/F)
      INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
        (gen_random_uuid(), q2, 'True', false, 0),
        (gen_random_uuid(), q2, 'False', true, 1);

    END $$;

# YOUR TASK
Below the line `<<INPUT_START>>` is the user's crawled markdown. Convert it
to a SQL seed file following ALL rules above. Return ONLY the SQL — no
explanation, no markdown fences, no preamble.

If the pool number is not obvious, ask the user before generating.

<<INPUT_START>>
[PASTE YOUR CRAWLED MARKDOWN HERE]
```

---

## Post-generation checklist

Sau khi AI trả file, làm 5 việc:

1. **Đếm câu**: số lượng `(q1,` `(q2,` … phải khớp `q{N}` trong DECLARE.
2. **Đếm correct**: tổng số `, true,` phải = (số câu single) × 1 + (số câu
   multi-2) × 2 + (số câu multi-3) × 3.
3. **Multi-select sanity**: với câu "choose the best N answers", đếm `, true,`
   trong block options của câu đó phải = N.
4. **T/F sanity**: câu T/F chỉ có đúng 2 options (`True` và `False`), 1 correct.
5. **Chạy thử trên 1 DB rỗng**: nếu fail vì `questions_stem_unique`, lấy stem
   trong error message, xóa câu đó khỏi seed mới, chạy lại.

## Nếu AI làm hỏng

Common failure modes:
- **Quote không escape**: AI quên double single quote → SQL parse error. Fix
  bằng prompt phụ: "Re-emit, ensuring all single quotes inside strings are
  doubled."
- **Multi-select đếm sai**: AI chọn 3 đáp án cho câu choose-2. Fix bằng
  prompt phụ: "Re-check Q{N}: the header says choose {N}, but you marked
  {M} options as correct."
- **Quên tag pool**: prompt phụ: "Every question must have
  'scrum-open-pool-{{N}}' as the last tag in its ARRAY."
- **Dịch quá tay** (dịch cả "Scrum"/"Sprint"): prompt phụ: "Keep Scrum
  terminology in English; only translate connectives and verbs."
