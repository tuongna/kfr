-- ============================================================
-- Seed data — 5 Scrum terms (per-owner)
-- Run AFTER creating your user account and replacing YOUR_USER_ID
-- ============================================================
-- Replace 'YOUR_USER_ID' with your actual auth.users uuid:
--   SELECT id FROM auth.users WHERE email = 'your@email.com';
-- ============================================================
-- Note: questions are seeded separately via seed_scrum_open.sql
-- (public, sourced from scrum.org Open Assessment).
-- ============================================================

DO $$
DECLARE
  owner uuid := 'YOUR_USER_ID';  -- <-- replace this

  -- Term IDs
  t_dod     uuid := gen_random_uuid();
  t_po      uuid := gen_random_uuid();
  t_sm      uuid := gen_random_uuid();
  t_spgoal  uuid := gen_random_uuid();
  t_pbref   uuid := gen_random_uuid();
BEGIN

  -- ---- Terms ----

  INSERT INTO public.terms (id, text, type, ipa, tags, source, owner_id) VALUES
    (t_dod,    'Definition of Done',        'phrase', NULL,          ARRAY['artifact','quality'],     'Scrum Guide 2020', owner),
    (t_po,     'Product Owner',             'phrase', NULL,          ARRAY['role','accountability'],  'Scrum Guide 2020', owner),
    (t_sm,     'Scrum Master',              'phrase', NULL,          ARRAY['role','accountability'],  'Scrum Guide 2020', owner),
    (t_spgoal, 'Sprint Goal',               'phrase', NULL,          ARRAY['artifact','planning'],    'Scrum Guide 2020', owner),
    (t_pbref,  'Product Backlog refinement','phrase', NULL,          ARRAY['event','planning'],       'Scrum Guide 2020', owner);

  -- ---- Term Senses ----

  -- Definition of Done
  INSERT INTO public.term_senses (term_id, register, en, vi, sort_order) VALUES
    (t_dod, 'general', 'A shared understanding of what "done" means for a piece of work.',
                       'Hiểu biết chung về ý nghĩa của "hoàn thành" cho một phần công việc.', 0),
    (t_dod, 'scrum',   'A formal description of the state of the Increment when it meets the quality measures required for the product.',
                       'Mô tả chính thức trạng thái của Increment khi đáp ứng các tiêu chí chất lượng cho sản phẩm. Không phải là tiêu chí chấp nhận của từng hạng mục.', 1);

  -- Product Owner
  INSERT INTO public.term_senses (term_id, register, en, vi, sort_order) VALUES
    (t_po, 'general', 'The person responsible for the product.',
                      'Người chịu trách nhiệm về sản phẩm.', 0),
    (t_po, 'scrum',   'Accountable for maximizing the value of the product resulting from the work of the Scrum Team. Manages the Product Backlog.',
                      'Chịu trách nhiệm tối đa hóa giá trị sản phẩm từ công việc của Scrum Team. Quản lý Product Backlog — không phải người duy nhất thêm hạng mục nhưng là người chịu trách nhiệm cuối cùng.', 1);

  -- Scrum Master
  INSERT INTO public.term_senses (term_id, register, en, vi, sort_order) VALUES
    (t_sm, 'general', 'A facilitator and coach for the Scrum process.',
                      'Người tạo điều kiện và huấn luyện về quy trình Scrum.', 0),
    (t_sm, 'scrum',   'Accountable for establishing Scrum as defined in the Scrum Guide. A true leader who serves the Scrum Team and the larger organization.',
                      'Chịu trách nhiệm áp dụng Scrum đúng theo Scrum Guide. Là nhà lãnh đạo thực sự phục vụ Scrum Team và tổ chức — KHÔNG phải project manager hay quản lý con người.', 1);

  -- Sprint Goal
  INSERT INTO public.term_senses (term_id, register, en, vi, sort_order) VALUES
    (t_spgoal, 'general', 'The objective to be achieved during a Sprint.',
                          'Mục tiêu cần đạt được trong Sprint.', 0),
    (t_spgoal, 'scrum',   'The single objective for the Sprint. Creates coherence and focus for the Scrum Team. Committed to by the Scrum Team during Sprint Planning.',
                          'Mục tiêu DUY NHẤT của Sprint. Tạo sự gắn kết và tập trung cho Scrum Team. Scrum Team cam kết trong Sprint Planning — và có thể điều chỉnh scope để đạt Goal, nhưng KHÔNG thể thay đổi Sprint Goal.', 1);

  -- Product Backlog refinement
  INSERT INTO public.term_senses (term_id, register, en, vi, sort_order) VALUES
    (t_pbref, 'general', 'The ongoing activity of reviewing and updating backlog items.',
                         'Hoạt động liên tục xem xét và cập nhật các hạng mục backlog.', 0),
    (t_pbref, 'scrum',   'The act of breaking down and further defining Product Backlog items into smaller more precise items. An ongoing activity, not a formal Scrum event.',
                         'Việc phân tách và làm rõ các hạng mục Product Backlog thành các phần nhỏ hơn, chính xác hơn. Đây là hoạt động LIÊN TỤC, KHÔNG phải một sự kiện Scrum chính thức.', 1);

END $$;
