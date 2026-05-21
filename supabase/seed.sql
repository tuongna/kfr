-- ============================================================
-- Seed data — 5 Scrum terms + 3 PSM-I questions (sample)
-- Run AFTER creating your user account and replacing YOUR_USER_ID
-- ============================================================
-- Replace 'YOUR_USER_ID' with your actual auth.users uuid:
--   SELECT id FROM auth.users WHERE email = 'your@email.com';
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

  -- Question IDs
  q1 uuid := gen_random_uuid();
  q2 uuid := gen_random_uuid();
  q3 uuid := gen_random_uuid();
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

  -- ---- Questions ----

  INSERT INTO public.questions (id, exam, stem, explanation_en, explanation_vi, tags, term_refs, owner_id) VALUES
    (q1, 'PSM-I',
     'Who is accountable for managing the Product Backlog?',
     'The Product Owner is solely accountable for Product Backlog management, including its content, availability, and ordering. However, the Product Owner may delegate the work to others.',
     'Product Owner là người DUY NHẤT chịu trách nhiệm quản lý Product Backlog — nội dung, sự sẵn sàng, và thứ tự ưu tiên. Tuy nhiên, PO có thể ủy thác công việc cho người khác.',
     ARRAY['role','product-backlog'],
     ARRAY[t_po], owner),

    (q2, 'PSM-I',
     'During a Sprint, when is it appropriate to update the Sprint Goal?',
     'The Sprint Goal is committed to during Sprint Planning and should not change during the Sprint. The scope can be renegotiated, but not the Sprint Goal itself.',
     'Sprint Goal được cam kết trong Sprint Planning và KHÔNG được thay đổi trong Sprint. Chỉ scope (nội dung công việc) mới có thể điều chỉnh để đạt Goal, không phải Goal.',
     ARRAY['sprint','sprint-goal'],
     ARRAY[t_spgoal], owner),

    (q3, 'PSM-I',
     'Which statement best describes the role of the Scrum Master during the Daily Scrum?',
     'The Daily Scrum is an event for the Developers. The Scrum Master does not run it. The Scrum Master teaches the Developers to keep the Daily Scrum within 15 minutes, but the Developers own the meeting.',
     'Daily Scrum là sự kiện của Developers. Scrum Master KHÔNG điều hành nó. SM đảm bảo sự kiện diễn ra nhưng Developers tự tổ chức — đây là điểm hay bị nhầm trong thi cử.',
     ARRAY['event','scrum-master','daily-scrum'],
     ARRAY[t_sm], owner);

  -- ---- Question Options ----

  -- Q1: Who manages Product Backlog?
  INSERT INTO public.question_options (question_id, text, correct, sort_order) VALUES
    (q1, 'The Product Owner',                                          true,  0),
    (q1, 'The Scrum Master',                                           false, 1),
    (q1, 'The Scrum Team as a whole',                                  false, 2),
    (q1, 'The stakeholders who requested the features',                false, 3);

  -- Q2: Sprint Goal change
  INSERT INTO public.question_options (question_id, text, correct, sort_order) VALUES
    (q2, 'Never — the Sprint Goal is fixed once the Sprint starts',    true,  0),
    (q2, 'Whenever the Product Owner requests it',                     false, 1),
    (q2, 'When the Developers discover it is unachievable',            false, 2),
    (q2, 'During the Daily Scrum if the team agrees',                  false, 3);

  -- Q3: Scrum Master at Daily Scrum
  INSERT INTO public.question_options (question_id, text, correct, sort_order) VALUES
    (q3, 'Ensures the event happens; Developers run it themselves',    true,  0),
    (q3, 'Facilitates the meeting and asks each Developer their update', false, 1),
    (q3, 'Takes notes and reports status to management',               false, 2),
    (q3, 'The Scrum Master is not required to attend',                 false, 3);

END $$;
