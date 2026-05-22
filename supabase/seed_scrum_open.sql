-- Scrum Open Assessment — 30 representative questions (PSM-I)
-- Run via: psql <connection-string> -f supabase/seed_scrum_open.sql
--       or paste into Supabase Studio → SQL Editor.

DO $$ DECLARE
  q1  uuid; q2  uuid; q3  uuid; q4  uuid; q5  uuid;
  q6  uuid; q7  uuid; q8  uuid; q9  uuid; q10 uuid;
  q11 uuid; q12 uuid; q13 uuid; q14 uuid; q15 uuid;
  q16 uuid; q17 uuid; q18 uuid; q19 uuid; q20 uuid;
  q21 uuid; q22 uuid; q23 uuid; q24 uuid; q25 uuid;
  q26 uuid; q27 uuid; q28 uuid; q29 uuid; q30 uuid;
BEGIN
  q1  := gen_random_uuid(); q2  := gen_random_uuid(); q3  := gen_random_uuid();
  q4  := gen_random_uuid(); q5  := gen_random_uuid(); q6  := gen_random_uuid();
  q7  := gen_random_uuid(); q8  := gen_random_uuid(); q9  := gen_random_uuid();
  q10 := gen_random_uuid(); q11 := gen_random_uuid(); q12 := gen_random_uuid();
  q13 := gen_random_uuid(); q14 := gen_random_uuid(); q15 := gen_random_uuid();
  q16 := gen_random_uuid(); q17 := gen_random_uuid(); q18 := gen_random_uuid();
  q19 := gen_random_uuid(); q20 := gen_random_uuid(); q21 := gen_random_uuid();
  q22 := gen_random_uuid(); q23 := gen_random_uuid(); q24 := gen_random_uuid();
  q25 := gen_random_uuid(); q26 := gen_random_uuid(); q27 := gen_random_uuid();
  q28 := gen_random_uuid(); q29 := gen_random_uuid(); q30 := gen_random_uuid();

  -- ────────────────────────────────────────────────────────────
  -- Questions
  -- ────────────────────────────────────────────────────────────
  INSERT INTO public.questions
    (id, exam, stem, explanation_en, explanation_vi, tags, term_refs)
  VALUES
    -- 1
    (q1, 'PSM-I',
     'What is the maximum length of a Sprint?',
     'The Scrum Guide states Sprints are one month or less. No Sprint may be longer than one month. When a Sprint''s horizon is too long, the Sprint Goal may become invalid and complexity may rise.',
     'Scrum Guide quy định Sprint có thời gian tối đa là một tháng. Sprint dài hơn có thể khiến Sprint Goal mất giá trị và rủi ro gia tăng.',
     ARRAY['sprint', 'timebox'], '{}'::uuid[]),

    -- 2
    (q2, 'PSM-I',
     'Who is accountable for maximizing the value of the product resulting from the work of the Scrum Team?',
     'The Product Owner is accountable for maximizing the value of the product resulting from the work of the Scrum Team. How this is done may vary widely across organizations, Scrum Teams, and individuals.',
     'Product Owner chịu trách nhiệm tối đa hóa giá trị của sản phẩm từ công việc của Scrum Team. Cách thực hiện có thể khác nhau tùy tổ chức.',
     ARRAY['product-owner', 'accountability'], '{}'::uuid[]),

    -- 3
    (q3, 'PSM-I',
     'What is the timebox for the Daily Scrum?',
     'The Daily Scrum is a 15-minute event for the Developers of the Scrum Team. To reduce complexity, it is held at the same time and place every working day of the Sprint.',
     'Daily Scrum là sự kiện 15 phút dành cho Developers. Được tổ chức cùng giờ, cùng địa điểm mỗi ngày làm việc trong Sprint để giảm phức tạp.',
     ARRAY['daily-scrum', 'timebox'], '{}'::uuid[]),

    -- 4
    (q4, 'PSM-I',
     'Who has the authority to cancel a Sprint?',
     'Only the Product Owner has the authority to cancel a Sprint. A Sprint would be cancelled if the Sprint Goal becomes obsolete. This is a rare occurrence.',
     'Chỉ Product Owner mới có quyền hủy Sprint. Sprint bị hủy khi Sprint Goal trở nên lỗi thời. Đây là trường hợp hiếm gặp.',
     ARRAY['sprint', 'product-owner', 'cancellation'], '{}'::uuid[]),

    -- 5
    (q5, 'PSM-I',
     'Which three pillars uphold every implementation of empirical process control?',
     'The three pillars of empiricism are Transparency, Inspection, and Adaptation. Scrum combines these pillars to make decisions based on what is observed rather than speculation.',
     'Ba trụ cột của chủ nghĩa kinh nghiệm trong Scrum là Minh bạch (Transparency), Thanh tra (Inspection) và Thích nghi (Adaptation). Đây là nền tảng cho mọi quyết định dựa trên thực tế quan sát được.',
     ARRAY['empiricism', 'transparency', 'inspection', 'adaptation'], '{}'::uuid[]),

    -- 6
    (q6, 'PSM-I',
     'Which statement about the Increment is correct?',
     'Multiple Increments may be created within a Sprint. The sum of the Increments is presented at the Sprint Review, supporting empiricism. The Product Owner may decide to release any Increment before the Sprint ends.',
     'Nhiều Increment có thể được tạo ra trong một Sprint. Product Owner có thể quyết định phát hành bất kỳ Increment nào trước khi Sprint kết thúc.',
     ARRAY['increment', 'sprint'], '{}'::uuid[]),

    -- 7
    (q7, 'PSM-I',
     'What is the maximum timebox for Sprint Planning for a one-month Sprint?',
     'Sprint Planning is timeboxed to a maximum of 8 hours for a one-month Sprint. For shorter Sprints, the event is usually shorter.',
     'Sprint Planning được giới hạn tối đa 8 giờ cho Sprint một tháng. Sprint ngắn hơn thường có Sprint Planning ngắn hơn tương ứng.',
     ARRAY['sprint-planning', 'timebox'], '{}'::uuid[]),

    -- 8
    (q8, 'PSM-I',
     'What is the commitment for the Sprint Backlog?',
     'The Sprint Goal is the commitment for the Sprint Backlog. The Sprint Goal is the single objective for the Sprint and provides flexibility to Developers while maintaining focus.',
     'Sprint Goal là cam kết gắn với Sprint Backlog. Sprint Goal tạo ra sự linh hoạt cho Developers trong khi vẫn duy trì trọng tâm nhất quán.',
     ARRAY['sprint-backlog', 'sprint-goal', 'commitment'], '{}'::uuid[]),

    -- 9
    (q9, 'PSM-I',
     'Which of the following best describes the Scrum Master''s role?',
     'The Scrum Master is accountable for establishing Scrum and coaching the Scrum Team in self-management and cross-functionality. The Scrum Master is a servant leader, not a manager who assigns work.',
     'Scrum Master chịu trách nhiệm thiết lập Scrum và huấn luyện Scrum Team về tự quản lý và đa chức năng. Scrum Master là người lãnh đạo phục vụ, không phải quản lý phân công công việc.',
     ARRAY['scrum-master', 'servant-leader'], '{}'::uuid[]),

    -- 10
    (q10, 'PSM-I',
     'Who are the members of a Scrum Team?',
     'A Scrum Team consists of one Scrum Master, one Product Owner, and Developers. There are no sub-teams or hierarchies within a Scrum Team; it is a cohesive unit of professionals.',
     'Scrum Team gồm một Scrum Master, một Product Owner và các Developers. Không có sub-team hay hệ thống phân cấp bên trong Scrum Team.',
     ARRAY['scrum-team'], '{}'::uuid[]),

    -- 11
    (q11, 'PSM-I',
     'What is the recommended size for a Scrum Team?',
     'The Scrum Team should be small enough to remain nimble and large enough to complete significant work within a Sprint — typically 10 or fewer people. If teams become too large, they should consider reorganizing into multiple cohesive Scrum Teams.',
     'Scrum Team đủ nhỏ để linh hoạt và đủ lớn để hoàn thành công việc đáng kể trong một Sprint — thường từ 10 người trở xuống.',
     ARRAY['scrum-team', 'team-size'], '{}'::uuid[]),

    -- 12
    (q12, 'PSM-I',
     'What is the maximum timebox for the Sprint Review for a one-month Sprint?',
     'The Sprint Review is timeboxed to a maximum of 4 hours for a one-month Sprint. For shorter Sprints, the event is usually shorter.',
     'Sprint Review được giới hạn tối đa 4 giờ cho Sprint một tháng. Sprint ngắn hơn thường có Sprint Review ngắn hơn tương ứng.',
     ARRAY['sprint-review', 'timebox'], '{}'::uuid[]),

    -- 13
    (q13, 'PSM-I',
     'What is the maximum timebox for the Sprint Retrospective for a one-month Sprint?',
     'The Sprint Retrospective is timeboxed to a maximum of 3 hours for a one-month Sprint. The Scrum Team inspects how the last Sprint went with regards to individuals, interactions, processes, tools, and the Definition of Done.',
     'Sprint Retrospective được giới hạn tối đa 3 giờ cho Sprint một tháng. Scrum Team kiểm tra cách Sprint vừa diễn ra liên quan đến con người, tương tác, quy trình và công cụ.',
     ARRAY['sprint-retrospective', 'timebox'], '{}'::uuid[]),

    -- 14
    (q14, 'PSM-I',
     'Who is responsible for creating the Definition of Done when there is no existing organizational standard?',
     'If the Definition of Done is not a standard of the organization, the Developers of the Scrum Team must create a Definition of Done appropriate for the product. The Scrum Master ensures the team has one.',
     'Nếu tổ chức không có tiêu chuẩn Definition of Done, các Developers của Scrum Team phải tự tạo DoD phù hợp với sản phẩm của họ.',
     ARRAY['definition-of-done'], '{}'::uuid[]),

    -- 15
    (q15, 'PSM-I',
     'Which of the following is one of Scrum''s three pillars of empiricism but NOT one of the five Scrum values?',
     'The three pillars are Transparency, Inspection, and Adaptation. The five Scrum values are: Commitment, Focus, Openness, Respect, and Courage. Transparency is a pillar, not a value.',
     'Ba trụ cột là: Transparency, Inspection, Adaptation. Năm giá trị Scrum là: Commitment, Focus, Openness, Respect, Courage. Transparency là trụ cột, không phải giá trị.',
     ARRAY['empiricism', 'scrum-values'], '{}'::uuid[]),

    -- 16
    (q16, 'PSM-I',
     'When multiple Scrum Teams are working on the same product, how many Product Backlogs should there be?',
     'There is one Product Backlog per product, regardless of how many Scrum Teams work on it. Having one Product Backlog ensures a single source of truth for priorities and goals.',
     'Chỉ có một Product Backlog cho mỗi sản phẩm, dù có bao nhiêu Scrum Team cùng làm việc. Điều này đảm bảo có một nguồn thông tin duy nhất về thứ tự ưu tiên.',
     ARRAY['product-backlog'], '{}'::uuid[]),

    -- 17
    (q17, 'PSM-I',
     'Who is responsible for sizing (estimating) Product Backlog items?',
     'The Developers who will be doing the work are responsible for the sizing of Product Backlog items. The Product Owner may influence by helping Developers understand and select trade-offs.',
     'Các Developers thực hiện công việc chịu trách nhiệm ước lượng kích thước của các Product Backlog item. Product Owner có thể hỗ trợ bằng cách làm rõ yêu cầu và trade-off.',
     ARRAY['product-backlog', 'estimation'], '{}'::uuid[]),

    -- 18
    (q18, 'PSM-I',
     'When is the Sprint Goal created?',
     'The Sprint Goal is created during Sprint Planning. It is the single objective for the Sprint and is crafted collaboratively by the Scrum Team. After Sprint Planning, the Developers inform the Product Owner of the Sprint Goal.',
     'Sprint Goal được tạo ra trong quá trình Sprint Planning. Đây là mục tiêu duy nhất cho Sprint, được tạo ra cùng nhau bởi Scrum Team.',
     ARRAY['sprint-goal', 'sprint-planning'], '{}'::uuid[]),

    -- 19
    (q19, 'PSM-I',
     'What is the primary purpose of the Daily Scrum?',
     'The Daily Scrum''s purpose is to inspect progress toward the Sprint Goal and adapt the Sprint Backlog as necessary, adjusting the upcoming planned work. It is not a status meeting for management.',
     'Mục đích của Daily Scrum là thanh tra tiến độ hướng tới Sprint Goal và thích nghi Sprint Backlog nếu cần. Đây không phải là cuộc họp báo cáo cho ban quản lý.',
     ARRAY['daily-scrum', 'sprint-goal'], '{}'::uuid[]),

    -- 20
    (q20, 'PSM-I',
     'Which description best fits the Scrum Master role?',
     'The Scrum Master is a servant leader who serves the Scrum Team and the larger organization. They help everyone understand Scrum theory and practice, and remove impediments to the Scrum Team''s progress.',
     'Scrum Master là người lãnh đạo phục vụ cho Scrum Team và tổ chức. Họ giúp mọi người hiểu lý thuyết và thực hành Scrum, đồng thời loại bỏ các trở ngại cho Scrum Team.',
     ARRAY['scrum-master', 'servant-leader'], '{}'::uuid[]),

    -- 21
    (q21, 'PSM-I',
     'What happens to incomplete Product Backlog items at the end of a Sprint?',
     'Incomplete Product Backlog items are returned to the Product Backlog. They are re-estimated and re-prioritized by the Product Owner in the next refinement cycle. The Sprint is NOT extended.',
     'Các Product Backlog item chưa hoàn thành được trả lại Product Backlog. Product Owner sẽ ước lượng lại và sắp xếp thứ tự ưu tiên trong chu kỳ refinement tiếp theo. Sprint không được kéo dài.',
     ARRAY['sprint', 'product-backlog'], '{}'::uuid[]),

    -- 22
    (q22, 'PSM-I',
     'Which statement about the Sprint Backlog is correct?',
     'The Sprint Backlog is updated throughout the Sprint as Developers learn more. Only Developers can change the Sprint Backlog; the Product Owner does not modify it unilaterally.',
     'Sprint Backlog được cập nhật liên tục trong suốt Sprint khi Developers học được nhiều hơn. Chỉ Developers mới có thể thay đổi Sprint Backlog.',
     ARRAY['sprint-backlog'], '{}'::uuid[]),

    -- 23
    (q23, 'PSM-I',
     'What best describes Product Backlog refinement?',
     'Product Backlog refinement is the act of breaking down and further defining Product Backlog items into smaller, more precise items. This is an ongoing activity in which the Product Owner and the Scrum Team collaborate.',
     'Product Backlog refinement là hoạt động phân tách và làm rõ thêm các Product Backlog item thành các mục nhỏ hơn, chính xác hơn. Đây là hoạt động liên tục giữa Product Owner và Scrum Team.',
     ARRAY['product-backlog', 'refinement'], '{}'::uuid[]),

    -- 24
    (q24, 'PSM-I',
     'What is the Product Goal?',
     'The Product Goal describes a future state of the product which can serve as a target for the Scrum Team to plan against. It is the commitment for the Product Backlog and represents the long-term objective.',
     'Product Goal mô tả trạng thái tương lai của sản phẩm mà Scrum Team hướng đến. Đây là cam kết của Product Backlog và là mục tiêu dài hạn cho Scrum Team.',
     ARRAY['product-goal', 'product-backlog'], '{}'::uuid[]),

    -- 25
    (q25, 'PSM-I',
     'Which statement best describes an Increment?',
     'An Increment is a concrete stepping stone toward the Product Goal. Each Increment is additive to all prior Increments and thoroughly verified, ensuring that all Increments work together. An Increment must be usable.',
     'Increment là một bước cụ thể hướng tới Product Goal. Mỗi Increment bổ sung cho tất cả các Increment trước đó và được xác minh kỹ lưỡng. Increment phải có thể sử dụng được.',
     ARRAY['increment', 'product-goal'], '{}'::uuid[]),

    -- 26
    (q26, 'PSM-I',
     'Which of the following is the complete set of Scrum values?',
     'The five Scrum values are: Commitment, Focus, Openness, Respect, and Courage. When these values are embodied and lived by the Scrum Team, the Scrum pillars of Transparency, Inspection, and Adaptation come to life.',
     'Năm giá trị Scrum là: Commitment (Cam kết), Focus (Tập trung), Openness (Cởi mở), Respect (Tôn trọng) và Courage (Dũng cảm). Những giá trị này là nền tảng văn hóa của Scrum.',
     ARRAY['scrum-values'], '{}'::uuid[]),

    -- 27
    (q27, 'PSM-I',
     'What is the purpose of the Sprint Review?',
     'The Sprint Review''s purpose is to inspect the outcome of the Sprint and determine future adaptations. The Scrum Team presents the results to key stakeholders and discusses progress toward the Product Goal. The Product Backlog may be adjusted.',
     'Mục đích của Sprint Review là thanh tra kết quả của Sprint và xác định hướng thích nghi tiếp theo. Scrum Team trình bày kết quả cho các stakeholders chính và thảo luận về tiến độ hướng tới Product Goal.',
     ARRAY['sprint-review', 'product-backlog'], '{}'::uuid[]),

    -- 28
    (q28, 'PSM-I',
     'What is the primary purpose of the Sprint Retrospective?',
     'The purpose of the Sprint Retrospective is to plan ways to increase quality and effectiveness. The Scrum Team inspects how the last Sprint went and identifies the most helpful improvements to implement next Sprint.',
     'Mục đích của Sprint Retrospective là lên kế hoạch cải thiện chất lượng và hiệu quả. Scrum Team kiểm tra Sprint vừa qua và xác định các cải tiến hữu ích nhất để áp dụng vào Sprint tiếp theo.',
     ARRAY['sprint-retrospective'], '{}'::uuid[]),

    -- 29
    (q29, 'PSM-I',
     'What does the Definition of Done provide for the Scrum Team?',
     'The Definition of Done creates transparency by providing everyone a shared understanding of what work is considered complete. If a Product Backlog item does not meet the DoD, it cannot be released or presented at the Sprint Review.',
     'Definition of Done tạo ra sự minh bạch bằng cách cung cấp hiểu biết chung về thế nào là "hoàn thành". Nếu một Product Backlog item không đáp ứng DoD, nó không thể phát hành hoặc trình bày tại Sprint Review.',
     ARRAY['definition-of-done', 'transparency'], '{}'::uuid[]),

    -- 30
    (q30, 'PSM-I',
     'Which statement best describes Scrum?',
     'Scrum is a lightweight framework that helps people, teams, and organizations generate value through adaptive solutions for complex problems. It is intentionally incomplete, only defining the parts required to implement Scrum theory.',
     'Scrum là một framework nhẹ giúp mọi người, nhóm và tổ chức tạo ra giá trị thông qua các giải pháp thích nghi cho các vấn đề phức tạp. Scrum cố tình không đầy đủ, chỉ định nghĩa những phần cần thiết.',
     ARRAY['scrum', 'framework'], '{}'::uuid[]);

  -- ────────────────────────────────────────────────────────────
  -- Options
  -- ────────────────────────────────────────────────────────────

  -- Q1: Max Sprint length
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q1, 'Two weeks', false, 0),
    (gen_random_uuid(), q1, 'One month', true, 1),
    (gen_random_uuid(), q1, 'Six weeks', false, 2),
    (gen_random_uuid(), q1, 'There is no maximum; it is up to the team', false, 3);

  -- Q2: Who maximizes product value
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q2, 'The Scrum Master', false, 0),
    (gen_random_uuid(), q2, 'The Developers', false, 1),
    (gen_random_uuid(), q2, 'The Product Owner', true, 2),
    (gen_random_uuid(), q2, 'The stakeholders', false, 3);

  -- Q3: Daily Scrum timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q3, '10 minutes', false, 0),
    (gen_random_uuid(), q3, '15 minutes', true, 1),
    (gen_random_uuid(), q3, '30 minutes', false, 2),
    (gen_random_uuid(), q3, 'It has no timebox; it ends when everyone has reported', false, 3);

  -- Q4: Who can cancel a Sprint
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q4, 'The Scrum Master', false, 0),
    (gen_random_uuid(), q4, 'The Developers', false, 1),
    (gen_random_uuid(), q4, 'The stakeholders', false, 2),
    (gen_random_uuid(), q4, 'The Product Owner', true, 3);

  -- Q5: Three pillars of empiricism
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q5, 'Planning, Execution, and Review', false, 0),
    (gen_random_uuid(), q5, 'Transparency, Inspection, and Adaptation', true, 1),
    (gen_random_uuid(), q5, 'Communication, Collaboration, and Commitment', false, 2),
    (gen_random_uuid(), q5, 'Vision, Value, and Velocity', false, 3);

  -- Q6: Multiple Increments in a Sprint
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q6, 'The Increment must be released at the end of every Sprint', false, 0),
    (gen_random_uuid(), q6, 'Multiple Increments may be created within a Sprint', true, 1),
    (gen_random_uuid(), q6, 'The Developers decide whether to release the Increment', false, 2),
    (gen_random_uuid(), q6, 'An Increment is only usable after the Sprint Review', false, 3);

  -- Q7: Sprint Planning timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q7, '4 hours', false, 0),
    (gen_random_uuid(), q7, '6 hours', false, 1),
    (gen_random_uuid(), q7, '8 hours', true, 2),
    (gen_random_uuid(), q7, '2 hours', false, 3);

  -- Q8: Sprint Backlog commitment
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q8, 'The Product Goal', false, 0),
    (gen_random_uuid(), q8, 'The Sprint Goal', true, 1),
    (gen_random_uuid(), q8, 'The Definition of Done', false, 2),
    (gen_random_uuid(), q8, 'The Release Plan', false, 3);

  -- Q9: Scrum Master role
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q9, 'Managing the team''s workload and assigning tasks', false, 0),
    (gen_random_uuid(), q9, 'Coaching the Scrum Team in self-management and cross-functionality', true, 1),
    (gen_random_uuid(), q9, 'Approving completed Sprint Backlog items', false, 2),
    (gen_random_uuid(), q9, 'Acting as a liaison between management and the Developers', false, 3);

  -- Q10: Scrum Team composition
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q10, 'Product Owner, Scrum Master, and Team Lead', false, 0),
    (gen_random_uuid(), q10, 'Product Owner, Scrum Master, and Developers', true, 1),
    (gen_random_uuid(), q10, 'Developers only', false, 2),
    (gen_random_uuid(), q10, 'Product Owner and Developers only', false, 3);

  -- Q11: Scrum Team size
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q11, '3 to 5 people', false, 0),
    (gen_random_uuid(), q11, '5 to 9 people', false, 1),
    (gen_random_uuid(), q11, '10 or fewer people', true, 2),
    (gen_random_uuid(), q11, 'There is no recommended size', false, 3);

  -- Q12: Sprint Review timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q12, '2 hours', false, 0),
    (gen_random_uuid(), q12, '3 hours', false, 1),
    (gen_random_uuid(), q12, '4 hours', true, 2),
    (gen_random_uuid(), q12, '8 hours', false, 3);

  -- Q13: Sprint Retrospective timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q13, '1 hour', false, 0),
    (gen_random_uuid(), q13, '2 hours', false, 1),
    (gen_random_uuid(), q13, '3 hours', true, 2),
    (gen_random_uuid(), q13, '4 hours', false, 3);

  -- Q14: Who creates DoD
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q14, 'The Scrum Master defines the Definition of Done', false, 0),
    (gen_random_uuid(), q14, 'The Product Owner defines the Definition of Done', false, 1),
    (gen_random_uuid(), q14, 'The Developers of the Scrum Team define the Definition of Done', true, 2),
    (gen_random_uuid(), q14, 'The stakeholders define the Definition of Done', false, 3);

  -- Q15: Pillar not a value
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q15, 'Commitment', false, 0),
    (gen_random_uuid(), q15, 'Openness', false, 1),
    (gen_random_uuid(), q15, 'Transparency', true, 2),
    (gen_random_uuid(), q15, 'Courage', false, 3);

  -- Q16: Product Backlogs for multiple teams
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q16, 'One Product Backlog per Scrum Team', false, 0),
    (gen_random_uuid(), q16, 'One Product Backlog for the entire product', true, 1),
    (gen_random_uuid(), q16, 'Two Product Backlogs — one for features, one for bugs', false, 2),
    (gen_random_uuid(), q16, 'As many as the Product Owners agree on', false, 3);

  -- Q17: Who sizes PB items
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q17, 'The Scrum Master provides estimates to keep planning objective', false, 0),
    (gen_random_uuid(), q17, 'The Product Owner estimates with input from stakeholders', false, 1),
    (gen_random_uuid(), q17, 'The Developers who will do the work are responsible for sizing', true, 2),
    (gen_random_uuid(), q17, 'An external project manager estimates the items', false, 3);

  -- Q18: When is Sprint Goal created
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q18, 'Before Sprint Planning, by the Product Owner', false, 0),
    (gen_random_uuid(), q18, 'During Sprint Planning, collaboratively by the Scrum Team', true, 1),
    (gen_random_uuid(), q18, 'During the Daily Scrum on the first day of the Sprint', false, 2),
    (gen_random_uuid(), q18, 'At the Sprint Review of the previous Sprint', false, 3);

  -- Q19: Purpose of Daily Scrum
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q19, 'To report status to the Scrum Master and Product Owner', false, 0),
    (gen_random_uuid(), q19, 'To inspect progress toward the Sprint Goal and adapt the Sprint Backlog', true, 1),
    (gen_random_uuid(), q19, 'To resolve technical impediments blocking the team', false, 2),
    (gen_random_uuid(), q19, 'To plan the next Sprint alongside the current one', false, 3);

  -- Q20: Scrum Master description
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q20, 'A manager who directs the work of Developers', false, 0),
    (gen_random_uuid(), q20, 'A servant leader who serves the Scrum Team and the organization', true, 1),
    (gen_random_uuid(), q20, 'A coordinator between the Product Owner and Developers', false, 2),
    (gen_random_uuid(), q20, 'A technical lead who makes architecture decisions for the team', false, 3);

  -- Q21: Incomplete work at Sprint end
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q21, 'The Sprint is extended until the work is complete', false, 0),
    (gen_random_uuid(), q21, 'Incomplete items are returned to the Product Backlog', true, 1),
    (gen_random_uuid(), q21, 'The Scrum Master decides what to do with the incomplete work', false, 2),
    (gen_random_uuid(), q21, 'Developers must work overtime to finish the incomplete items', false, 3);

  -- Q22: Sprint Backlog during Sprint
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q22, 'The Sprint Backlog is fixed once Sprint Planning is complete', false, 0),
    (gen_random_uuid(), q22, 'Only the Product Owner can change the Sprint Backlog', false, 1),
    (gen_random_uuid(), q22, 'The Sprint Backlog is updated by Developers throughout the Sprint as more is learned', true, 2),
    (gen_random_uuid(), q22, 'The Sprint Backlog cannot be changed once the Sprint begins', false, 3);

  -- Q23: Product Backlog refinement
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q23, 'A formal Sprint event timeboxed to 2 hours', false, 0),
    (gen_random_uuid(), q23, 'The act of breaking down and further defining Product Backlog items', true, 1),
    (gen_random_uuid(), q23, 'The Scrum Master''s responsibility for keeping the backlog clean', false, 2),
    (gen_random_uuid(), q23, 'A technique for removing items that are no longer needed', false, 3);

  -- Q24: Product Goal
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q24, 'The revenue target the product must achieve', false, 0),
    (gen_random_uuid(), q24, 'The long-term objective for the Scrum Team, and the commitment for the Product Backlog', true, 1),
    (gen_random_uuid(), q24, 'A Sprint-level goal set during Sprint Planning', false, 2),
    (gen_random_uuid(), q24, 'A daily goal set at each Daily Scrum', false, 3);

  -- Q25: Increment definition
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q25, 'The list of features completed during a Sprint', false, 0),
    (gen_random_uuid(), q25, 'A concrete stepping stone toward the Product Goal that is usable', true, 1),
    (gen_random_uuid(), q25, 'The Sprint Backlog items moved to the "Done" column', false, 2),
    (gen_random_uuid(), q25, 'The Product Backlog items selected for the next Sprint', false, 3);

  -- Q26: Scrum values
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q26, 'Courage, Focus, Commitment, Respect, and Openness', true, 0),
    (gen_random_uuid(), q26, 'Courage, Focus, Commitment, Honesty, and Openness', false, 1),
    (gen_random_uuid(), q26, 'Courage, Speed, Commitment, Respect, and Openness', false, 2),
    (gen_random_uuid(), q26, 'Courage, Focus, Trust, Respect, and Openness', false, 3);

  -- Q27: Sprint Review purpose
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q27, 'A formal demo for stakeholders to approve completed features', false, 0),
    (gen_random_uuid(), q27, 'To inspect the Increment and adapt the Product Backlog', true, 1),
    (gen_random_uuid(), q27, 'An informal meeting for Developers to show their work to management', false, 2),
    (gen_random_uuid(), q27, 'A formal acceptance test of completed features', false, 3);

  -- Q28: Sprint Retrospective purpose
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q28, 'To review the Increment with key stakeholders', false, 0),
    (gen_random_uuid(), q28, 'To plan improvements to quality and effectiveness for the next Sprint', true, 1),
    (gen_random_uuid(), q28, 'To update the Product Backlog with new items', false, 2),
    (gen_random_uuid(), q28, 'To estimate items for the upcoming Sprint', false, 3);

  -- Q29: Definition of Done provides
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q29, 'A checklist of technical standards set by the Scrum Master', false, 0),
    (gen_random_uuid(), q29, 'A shared understanding of what work is considered complete, creating transparency', true, 1),
    (gen_random_uuid(), q29, 'A record of all bugs found during testing', false, 2),
    (gen_random_uuid(), q29, 'A set of acceptance criteria defined per Sprint by stakeholders', false, 3);

  -- Q30: Scrum definition
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q30, 'A methodology that prescribes exactly how teams should build products', false, 0),
    (gen_random_uuid(), q30, 'A project management framework specific to software development', false, 1),
    (gen_random_uuid(), q30, 'A lightweight framework for generating value through adaptive solutions for complex problems', true, 2),
    (gen_random_uuid(), q30, 'A set of best practices for agile software development teams', false, 3);

END $$;
