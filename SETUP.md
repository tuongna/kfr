# Setup Guide

## Các bước thủ công cần thực hiện trên dashboard

### 1. Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New project → đặt tên `kfr`.
2. Ghi lại **Project URL** và **anon public key** (Settings → API).
3. Chạy migrations trong Supabase SQL Editor (theo thứ tự):
   - `supabase/migrations/001_schema.sql` → `002_rls.sql` → `003_ai_terms.sql`
   - `supabase/migrations/004_public_questions.sql` → `005_question_source.sql`
   - `supabase/migrations/006_unique_question_stem.sql` (ngăn câu hỏi trùng stem)
4. Bật Auth → Providers → **Google** (cần Google Cloud OAuth credentials).
5. Trong Authentication → URL Configuration:
   - Site URL: `https://tuongna.github.io` (hoặc URL app của bạn)
   - Redirect URLs: thêm cùng URL trên

### 2. Seed dữ liệu mẫu

1. Đăng nhập app một lần để tạo user.
2. Lấy user ID của bạn:
   ```sql
   SELECT id FROM auth.users WHERE email = 'your@email.com';
   ```
3. Sửa `supabase/seed.sql`: thay `YOUR_USER_ID` bằng ID thực.
4. Chạy seed trong SQL Editor.
5. (Tùy chọn) Seed thêm bộ câu hỏi Scrum Open Assessment (PSM-I, public, không cần user ID):
   - `supabase/seed_scrum_open.sql` — Pool 1: 30 câu (tag `scrum-open-pool-1`)
   - `supabase/seed_scrum_open_v2.sql` — Pool 2: 30 câu (tag `scrum-open-pool-2`)

   **Chống trùng:** mỗi seed có `DELETE ... WHERE 'scrum-open-pool-N' = ANY(tags)` ở
   đầu file → chạy lại file nào chỉ xóa data của pool đó, không động đến pool còn
   lại. Migration `006_unique_question_stem.sql` cũng ngăn 2 câu hỏi có cùng stem
   ở mức DB (nếu crawl thêm bộ mới, INSERT sẽ fail nếu stem trùng — bạn biết được
   ngay câu nào trùng để xử lý).

   **Thêm pool mới từ markdown crawl:** xem `docs/quiz-import-prompt.md` — chứa
   prompt sẵn để paste vào AI bất kỳ (Claude/GPT/Gemini) để convert raw markdown
   sang file `seed_scrum_open_vN.sql`.

### 3. Cài GitHub Secrets

Vào repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret name        | Giá trị                                                   |
|--------------------|-----------------------------------------------------------|
| `SUPABASE_URL`     | Project URL (vd: `https://abcdef.supabase.co`)            |
| `SUPABASE_ANON_KEY`| anon public key từ Supabase                               |
| `BASE_PATH`        | Để trống nếu deploy root, hoặc `/kfr` nếu dùng subpath   |
| `OPENROUTER_API_KEY` | Key từ openrouter.ai (cho Edge Function)                |

### 4. Deploy OpenRouter Edge Function

```bash
# Cài Supabase CLI: https://supabase.com/docs/guides/cli
npm install -g supabase

# Login và link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set secret (lấy từ GitHub Secret hoặc trực tiếp)
supabase secrets set OPENROUTER_API_KEY=sk-or-...
supabase secrets set SITE_URL=https://tuongna.github.io
# Production: không dùng '*', chỉ cho phép đúng domain frontend
supabase secrets set ALLOWED_ORIGINS=https://tuongna.github.io

# Deploy function
supabase functions deploy openrouter --no-verify-jwt
```

### 5. Bật GitHub Pages

Repository → Settings → Pages:
- Source: **GitHub Actions**
- (không cần chọn branch, workflow tự deploy)

Push lên `main` là deploy tự động chạy.

### 6. Biên soạn nội dung (Supabase Studio)

Vào **Table Editor** trong Supabase dashboard:

- `terms`: thêm từ/cụm từ Scrum (text, type, ipa, tags, source, owner_id = YOUR_USER_ID)
- `term_senses`: thêm nghĩa cho mỗi term (term_id, register=general/scrum, en, vi)
- `questions`: thêm câu hỏi PSM/PSPO (exam, stem, explanation_en, explanation_vi, term_refs=array[uuid])
- `question_options`: thêm 4 đáp án cho mỗi câu hỏi (question_id, text, correct=true/false)

**Lưu ý:** `owner_id` phải là UUID của tài khoản bạn đăng nhập (không thì RLS block).

### 7. Dev local

```bash
cp .env.example .env
# Điền PUBLIC_SUPABASE_URL và PUBLIC_SUPABASE_ANON_KEY vào .env

npm install
npm run dev
```

### Cấu hình base path

Nếu app deploy tại `tuongna.github.io/kfr` (không phải root):
- Set GitHub Secret `BASE_PATH=/kfr`
- Supabase Redirect URL cũng cần thêm `https://tuongna.github.io/kfr`

Nếu deploy tại root `tuongna.github.io`:
- `BASE_PATH` để trống hoặc không set
