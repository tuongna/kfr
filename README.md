# KfR — Scrum Learning

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-lightgrey.svg)

🔗 Live App: [https://tuongna.github.io/kfr](https://tuongna.github.io/kfr)

## About

KfR là Progressive Web App (PWA) học tiếng Anh chuyên ngành **Scrum**, phục vụ luyện thi **PSM I** và **PSPO I**.

Mục tiêu: giúp người học người Việt hiểu đúng cách diễn đạt tiếng Anh trong câu hỏi và đáp án thi Scrum — tập trung vào từ đơn, cụm từ, và sắc thái ngữ nghĩa trong từng ngữ cảnh.

## Features

- **Tap-to-gloss**: nhấn vào thuật ngữ bất kỳ để xem đa nghĩa (nghĩa đời thường + nghĩa Scrum chính xác)
- **Flashcard + SRS**: hệ thống ôn tập lặp lại cách quãng (Spaced Repetition) với XP và huy hiệu
- **Quiz PSM/PSPO**: câu hỏi 4 đáp án phong cách thi thật, có giải thích chi tiết + liên kết thuật ngữ
- **Glossary**: tra cứu toàn bộ thuật ngữ, lọc theo tag, xem đa nghĩa ngay trong danh sách
- **Offline-first PWA**: content cache trong IndexedDB, Service Worker cache app shell
- **Đồng bộ đa thiết bị**: tiến độ học lưu trên Supabase, merge thông minh (level=max, xp=max, nextReview=min)
- **Nội dung private**: chỉ tài khoản được uỷ quyền (owner) đọc được content, bảo vệ bằng Supabase RLS

## Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | SvelteKit 2 + adapter-static |
| Build | Vite 5 |
| PWA | vite-plugin-pwa (Workbox) |
| Local DB | Dexie (IndexedDB) |
| Backend | Supabase (Auth + Postgres + Edge Functions) |
| AI proxy | Supabase Edge Function → OpenRouter |
| Test | Vitest |
| CI/CD | GitHub Actions → GitHub Pages |

## Setup

Xem [`SETUP.md`](SETUP.md) để biết cách cấu hình Supabase, GitHub Secrets, biên soạn nội dung, và deploy.

## Dev

```bash
cp .env.example .env   # fill in Supabase keys
npm install
npm run dev            # http://localhost:5173
npm test               # vitest
npm run build          # production build
```

## License

Source code: Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
