-- Scrum Open Assessment — Pool 2 (30 questions, PSM-I)
-- Complements supabase/seed_scrum_open.sql with a different question pool
-- (same Scrum.org Open Assessment source, different sampled questions).
-- Idempotent: re-running this file removes Pool 2 questions (by tag) and re-inserts.
-- Pool 1 questions (seed_scrum_open.sql) are NOT affected.
-- Run via: psql <connection-string> -f supabase/seed_scrum_open_v2.sql
--       or paste into Supabase Studio → SQL Editor.

-- ── Idempotency: drop prior Pool 2 rows; options cascade via FK ─────
DELETE FROM public.questions
  WHERE source = 'Scrum Open Assessment'
    AND owner_id IS NULL
    AND 'scrum-open-pool-2' = ANY(tags);

DO $$ DECLARE
  -- Static UUIDs: stable across re-runs so public.progress records are preserved.
  q1   uuid := '895574b9-b254-4b5d-b60e-a380fa656d1f';
  q2   uuid := 'b1c4c523-8e38-4b1c-83a3-8b01127aa774';
  q3   uuid := '54508494-2d07-47a4-987a-3c66c7712c9d';
  q4   uuid := '1f1bd4fb-9b0a-4c35-bfe9-9f309bc42ff5';
  q5   uuid := '91ae970d-04d8-485a-a414-e88c5ee9178e';
  q6   uuid := '36ddbf8c-b96c-4811-8a6a-87bf6d63a298';
  q7   uuid := 'ee451a29-3984-4544-8b74-107b93562187';
  q8   uuid := '58d397ad-b7ca-4620-9dcf-2d6175e19f0f';
  q9   uuid := 'e808d062-9684-4ad9-8d24-d88c31db62ba';
  q10  uuid := '6e1a0417-d887-452f-8d09-530b93635ed7';
  q11  uuid := 'dbfeabab-59c0-4349-99ec-02436039a2a0';
  q12  uuid := 'd000ab85-3d57-423c-abea-1f3fe183839e';
  q13  uuid := '0e220843-e8f9-4d8e-ab8c-43fe1e2e5f0a';
  q14  uuid := 'e80430a2-ae0d-4fc0-a3fc-70755da67def';
  q15  uuid := 'bfce5387-7d99-41af-87fd-a86b8b3172b6';
  q16  uuid := 'e1229da9-93bd-499f-b728-2ea49fb2933b';
  q17  uuid := 'c29213e6-9e5a-48fb-afe6-193060555ec6';
  q18  uuid := 'c5c2c436-4e4d-42a2-acf2-0b6acaf88974';
  q19  uuid := '23d82cfa-6bb5-4e89-a1be-a3d046f216c9';
  q20  uuid := '91b6e187-3632-4192-99db-ac6b988b4dd6';
  q21  uuid := '5049594c-4a13-40fb-b3f7-ae59de6a70fe';
  q22  uuid := 'df03e597-e47a-4253-8342-149e038b15e2';
  q23  uuid := 'd29f8b20-9bda-4e4e-a029-cb4e7c0f2576';
  q24  uuid := '9197a9b9-7edd-4ac2-9744-c1efb6822634';
  q25  uuid := 'c67666b6-c7ed-41f7-b988-d8723bfa23c4';
  q26  uuid := 'b623f0a5-cc1d-46a8-a469-a8695e60f9d1';
  q27  uuid := '57f50ed9-cd01-4d39-8c9e-cf4ec71a25c2';
  q28  uuid := '2d6bb48b-0bb8-46b2-8951-8d30eee394a8';
  q29  uuid := '5dbea826-6f3f-4cbd-a4f9-9cc44e7d8e48';
  q30  uuid := 'd7de55f6-ca0a-41de-af0d-9e36e26a12fd';
BEGIN

  -- ────────────────────────────────────────────────────────────
  -- Questions
  -- ────────────────────────────────────────────────────────────
  INSERT INTO public.questions
    (id, exam, stem, explanation_en, explanation_vi, tags, term_refs, source, quality)
  VALUES
    -- 1
    (q1, 'PSM-I',
     'When does a Developer become accountable for the value of a Product Backlog item selected for the Sprint?',
     'All members of the Scrum Team share in the accountability for creating value every Sprint. No individual Developer is singled out as accountable for an item''s value.',
     'Toàn bộ Scrum Team cùng chịu trách nhiệm tạo ra giá trị mỗi Sprint. Không một Developer riêng lẻ nào là người chịu trách nhiệm về giá trị của một Product Backlog item.',
     ARRAY['scrum-team', 'accountability', 'value', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 2
    (q2, 'PSM-I',
     'The Developers should have all the skills needed to:',
     'The Developers are a group of professionals who do the work of delivering an Increment of done product at the end of each Sprint. As a team, Developers have all of the skills necessary to create a product Increment.',
     'Developers là nhóm chuyên gia có nhiệm vụ tạo ra Increment "done" mỗi Sprint. Cả nhóm phải có đầy đủ kỹ năng cần thiết để tạo ra Increment — bao gồm cả testing chuyên biệt.',
     ARRAY['developers', 'cross-functional', 'increment', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 3
    (q3, 'PSM-I',
     'When should a Developer on a Scrum Team be replaced?',
     'Scrum Teams typically go through some steps before achieving a state of increased performance. Changing membership typically reduces cohesion, affecting performance and productivity in the short term.',
     'Thay đổi thành viên Scrum Team thường làm giảm sự gắn kết, ảnh hưởng ngắn hạn đến năng suất. Vẫn nên thay khi cần, nhưng phải tính đến tác động ngắn hạn này.',
     ARRAY['scrum-team', 'team-stability', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 4
    (q4, 'PSM-I',
     'Which of the following services is appropriate for a Scrum Master in regard to the Daily Scrum?',
     'The Scrum Master ensures that the Developers have the event, but the Developers are responsible for conducting the Daily Scrum. The Scrum Master teaches the Developers to keep the Daily Scrum within the 15-minute timebox.',
     'Scrum Master đảm bảo Developers có sự kiện Daily Scrum, nhưng chính Developers mới điều hành. Scrum Master dạy/huấn luyện Developers giữ Daily Scrum trong khung 15 phút — không phải dẫn dắt thảo luận hay đảm bảo trả lời "3 câu hỏi".',
     ARRAY['scrum-master', 'daily-scrum', 'timebox', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 5
    (q5, 'PSM-I',
     'Which statement best describes the Sprint Review?',
     'Every event in Scrum, besides the Sprint, which is a container for the other events, is an opportunity to Inspect and Adapt. The Sprint Review is when the Scrum Team and stakeholders inspect the outcome and figure out what to do next.',
     'Sprint Review là dịp Scrum Team và stakeholders cùng thanh tra kết quả của Sprint và quyết định hướng đi tiếp theo. Không phải cuộc demo cho cả tổ chức, cũng không phải cơ chế kiểm soát hoạt động của Developers.',
     ARRAY['sprint-review', 'inspect-adapt', 'stakeholders', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 6
    (q6, 'PSM-I',
     'Who creates the Definition of Done?',
     'If the Definition of Done for an Increment is part of the standards of the organization, all Scrum Teams must follow it as a minimum. If it is not an organizational standard, the Scrum Team must create a Definition of Done appropriate for the product.',
     'Nếu tổ chức có tiêu chuẩn Definition of Done, mọi Scrum Team phải tuân theo. Nếu không, chính Scrum Team phải tự tạo DoD phù hợp với sản phẩm của mình.',
     ARRAY['definition-of-done', 'scrum-team', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 7 (multi-select: choose 2)
    (q7, 'PSM-I',
     'What are two ways a Scrum Master serves to enable effective Scrum Teams? (choose the best two answers)',
     'The Scrum Master serves the Scrum Team in several ways. Facilitation and removing impediments are two key examples that directly enable team effectiveness.',
     'Scrum Master phục vụ Scrum Team theo nhiều cách. Hai ví dụ tiêu biểu giúp Team hiệu quả hơn: gỡ bỏ trở ngại (impediments) và tạo điều kiện (facilitate) cho việc ra quyết định của Developers.',
     ARRAY['scrum-master', 'servant-leader', 'multi-select', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 8
    (q8, 'PSM-I',
     'The timebox for the Sprint Planning event is?',
     'Sprint Planning is timeboxed to a maximum of eight hours for a one-month Sprint. For shorter Sprints, the event is usually shorter.',
     'Sprint Planning có timebox tối đa 8 giờ cho Sprint một tháng. Sprint ngắn hơn thì sự kiện này thường ngắn hơn tương ứng.',
     ARRAY['sprint-planning', 'timebox', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 9
    (q9, 'PSM-I',
     'What is the main reason for the Scrum Master to be at the Daily Scrum?',
     'The Scrum Master only ensures that all Scrum events take place and are positive, productive, and kept within the timebox. They do not have to attend — only ensure the Developers have a Daily Scrum.',
     'Scrum Master chỉ đảm bảo các sự kiện Scrum diễn ra, tích cực và đúng timebox. Họ KHÔNG bắt buộc phải có mặt tại Daily Scrum — chỉ cần đảm bảo Developers có sự kiện này.',
     ARRAY['scrum-master', 'daily-scrum', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 10
    (q10, 'PSM-I',
     'What is the typical size for a Scrum Team?',
     'A Scrum Team is small enough to remain nimble and large enough to complete significant work within a Sprint, typically 10 or fewer people. Generally smaller teams communicate better and are more productive.',
     'Scrum Team đủ nhỏ để linh hoạt nhưng đủ lớn để hoàn thành công việc đáng kể trong một Sprint — thường từ 10 người trở xuống. Nhóm nhỏ thường giao tiếp tốt hơn và năng suất hơn.',
     ARRAY['scrum-team', 'team-size', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 11 (true/false)
    (q11, 'PSM-I',
     'True or False: Scrum has a role called "project manager."',
     'A Scrum Team has a Scrum Master, a Product Owner and Developers. As a whole they have all controls needed. There is no "project manager" role in Scrum.',
     'Scrum Team chỉ gồm Scrum Master, Product Owner và Developers. Cả nhóm có đủ quyền kiểm soát cần thiết. Scrum KHÔNG có vai trò "project manager".',
     ARRAY['scrum-team', 'roles', 'true-false', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 12 (multi-select: choose 3)
    (q12, 'PSM-I',
     'Who is on the Scrum Team? (choose the best three answers)',
     'The Scrum Team consists of the Scrum Master, the Product Owner and Developers. The Scrum Team is a cohesive unit of professionals focused on one objective at a time, the Product Goal.',
     'Scrum Team bao gồm Scrum Master, Product Owner và Developers. Đây là một đơn vị gắn kết của các chuyên gia, tập trung vào một mục tiêu duy nhất tại một thời điểm — Product Goal.',
     ARRAY['scrum-team', 'roles', 'multi-select', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 13
    (q13, 'PSM-I',
     'What does it mean to say that an event has a timebox?',
     'Timeboxed events are events that have a maximum duration. The event must end by that maximum, regardless of whether all participants feel "done."',
     'Sự kiện có timebox nghĩa là có thời lượng TỐI ĐA. Sự kiện phải kết thúc trong khung thời gian này, bất kể người tham gia có thấy "xong" hay chưa.',
     ARRAY['timebox', 'events', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 14
    (q14, 'PSM-I',
     'Which statement best describes a Product Owner''s responsibility?',
     'The Product Owner is accountable for maximizing the value of the product and the work of the Scrum Team.',
     'Product Owner chịu trách nhiệm tối đa hóa giá trị của sản phẩm và công việc của Scrum Team. KHÔNG phải chỉ đạo Developers hay quản lý dự án theo cam kết với stakeholders.',
     ARRAY['product-owner', 'accountability', 'value', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 15 (multi-select: choose 3)
    (q15, 'PSM-I',
     'A Scrum Team consists of the following: (choose the best three answers)',
     'The Scrum Team consists of one Scrum Master, one Product Owner, and Developers. Customers and users are stakeholders, not members of the Scrum Team.',
     'Scrum Team gồm một Scrum Master, một Product Owner và các Developers. Khách hàng và người dùng là stakeholders, KHÔNG phải thành viên Scrum Team.',
     ARRAY['scrum-team', 'roles', 'multi-select', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 16 (true/false)
    (q16, 'PSM-I',
     'True or False: The Scrum Team must choose at least one high priority process improvement item, identified during the Sprint Retrospective, and place it in the Sprint Backlog.',
     'An earlier version of the Scrum Guide prescribed this practice, but it was removed in the 2020 update because it was felt to be too prescriptive. It may still be valuable, but is no longer prescribed.',
     'Phiên bản Scrum Guide trước đây có yêu cầu này, nhưng bản 2020 đã loại bỏ vì cho rằng quá quy định cụ thể. Thực hành này vẫn có thể hữu ích nhưng không còn bắt buộc.',
     ARRAY['sprint-retrospective', 'scrum-guide-2020', 'true-false', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 17
    (q17, 'PSM-I',
     'When does a Developer become the sole owner of an item on the Sprint Backlog?',
     'The entire Scrum Team is accountable for creating a valuable, useful Increment every Sprint. The set of Product Backlog items selected for the Sprint is collectively owned by the Developers. No individual Developer can claim sole ownership over an item.',
     'Toàn bộ Scrum Team chịu trách nhiệm tạo Increment có giá trị mỗi Sprint. Các item trong Sprint Backlog thuộc sở hữu CHUNG của Developers. Không Developer nào "sở hữu riêng" một item — vì điều đó sẽ chặn giao tiếp và cộng tác.',
     ARRAY['sprint-backlog', 'developers', 'ownership', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 18
    (q18, 'PSM-I',
     'Who is required to attend the Daily Scrum?',
     'Only the people doing the work described on the Sprint Backlog need to inspect and adapt at the Daily Scrum. If the Product Owner or Scrum Master are actively working on items in the Sprint Backlog, they participate as Developers.',
     'Chỉ những người đang thực hiện công việc trong Sprint Backlog cần tham gia Daily Scrum. Nếu Product Owner hoặc Scrum Master đang làm việc trên các item Sprint Backlog, họ tham gia với tư cách Developers.',
     ARRAY['daily-scrum', 'developers', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 19
    (q19, 'PSM-I',
     'The timebox for a Daily Scrum is?',
     'The Daily Scrum is always a 15-minute event. Because it is a short event, the timebox is not influenced by the Sprint length.',
     'Daily Scrum LUÔN LUÔN là sự kiện 15 phút. Vì là sự kiện ngắn, timebox không bị ảnh hưởng bởi độ dài của Sprint (khác với Sprint Planning/Review/Retrospective).',
     ARRAY['daily-scrum', 'timebox', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 20
    (q20, 'PSM-I',
     'How much work must the Developers complete for each Sprint?',
     'The purpose of each Sprint is to deliver useful and valuable Increments that adhere to the Scrum Team''s current Definition of Done.',
     'Mục đích của mỗi Sprint là tạo ra Increment hữu ích và có giá trị, đáp ứng Definition of Done hiện tại của Scrum Team. Không phải "càng nhiều càng tốt" mà là "đủ để đạt DoD".',
     ARRAY['definition-of-done', 'increment', 'sprint', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 21
    (q21, 'PSM-I',
     'The timebox for the Sprint Review is:',
     'Sprint Review is a maximum four-hour timeboxed event for one-month Sprints. For shorter Sprints, the event is usually shorter.',
     'Sprint Review có timebox tối đa 4 giờ cho Sprint một tháng. Sprint ngắn hơn thì sự kiện này thường ngắn hơn tương ứng.',
     ARRAY['sprint-review', 'timebox', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 22
    (q22, 'PSM-I',
     'What is the purpose of the Sprint Goal?',
     'The Sprint Goal is the single objective for the Sprint. It provides flexibility to the Developers regarding the exact work needed to achieve it, but also creates coherence and focus, encouraging the Scrum Team to work together rather than on separate initiatives.',
     'Sprint Goal là mục tiêu DUY NHẤT của Sprint. Nó cho phép Developers linh hoạt về công việc cụ thể để đạt được mục tiêu, đồng thời tạo sự gắn kết và tập trung — khuyến khích cả nhóm cùng làm việc hướng tới một mục tiêu chung thay vì các sáng kiến riêng lẻ.',
     ARRAY['sprint-goal', 'sprint-planning', 'focus', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 23 (multi-select: choose 3)
    (q23, 'PSM-I',
     'What are three incorrect, untrue, or misleading statements about Scrum? (choose the best three answers)',
     'Scrum is meant to be implemented as prescribed in the Scrum Guide — you cannot pick and choose. Scrum does NOT eliminate complexity; it provides a framework for dealing with it. Project Managers are not simply replaced by self-managing teams — Scrum optimizes decision making based on the entire team''s knowledge.',
     'Ba phát biểu sai/gây hiểu nhầm: (A) Scrum không phải methodology để chọn-bỏ tùy ý; (D) Scrum không phải process truyền thống chỉ thay PM bằng tự-tổ-chức; (E) Scrum KHÔNG loại bỏ độ phức tạp — mà cung cấp framework để xử lý nó. Các phát biểu B, C, F là đúng.',
     ARRAY['scrum', 'framework', 'misconceptions', 'multi-select', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 24
    (q24, 'PSM-I',
     'When might a Sprint be cancelled?',
     'A Sprint could be cancelled if the Sprint Goal becomes obsolete. Only the Product Owner has the authority to cancel the Sprint.',
     'Sprint chỉ bị hủy khi Sprint Goal trở nên lỗi thời. Chỉ có Product Owner mới có quyền hủy Sprint — không phải vì "công việc khó", "có cơ hội mới", hay "không kịp hoàn thành".',
     ARRAY['sprint', 'sprint-goal', 'product-owner', 'cancellation', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 25
    (q25, 'PSM-I',
     'Who should know the most about the progress toward a business objective or a release, and be able to explain the alternatives most clearly?',
     'The Product Owner is accountable for maximizing the value of the product resulting from the work of the Scrum Team. Their accountabilities include developing and communicating the Product Goal, creating and communicating Product Backlog items, ordering the Product Backlog, and ensuring it is transparent, visible and understood.',
     'Product Owner là người nắm rõ nhất tiến độ hướng tới mục tiêu kinh doanh và bản phát hành. PO có trách nhiệm: phát triển và truyền đạt Product Goal, tạo và truyền đạt các Product Backlog item, sắp xếp Product Backlog và đảm bảo nó minh bạch.',
     ARRAY['product-owner', 'product-backlog', 'product-goal', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 26 (true/false)
    (q26, 'PSM-I',
     'True or False: When multiple Scrum Teams work together on the same product, each team should maintain a separate Product Backlog.',
     'Products have one Product Backlog, regardless of how many Scrum Teams are used. Any other setup makes it difficult for the Developers to determine what they should work on.',
     'Mỗi sản phẩm chỉ có MỘT Product Backlog, bất kể có bao nhiêu Scrum Team cùng làm. Cách bố trí khác sẽ khiến Developers khó xác định nên làm gì.',
     ARRAY['product-backlog', 'scaling', 'true-false', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 27
    (q27, 'PSM-I',
     'During a Sprint, a Developer determines that the Scrum Team will not be able to complete the items in their forecast. Who should be present to review and adjust the Product Backlog items selected?',
     'During the Sprint, scope may be clarified and re-negotiated between the Product Owner and the Developers as more is learned. It is important to be transparent when challenges arise since the entire Scrum Team is accountable for creating a valuable, useful Increment.',
     'Trong Sprint, phạm vi có thể được làm rõ và đàm phán lại giữa Product Owner và Developers khi học được thêm. Phải minh bạch khi gặp khó khăn — vì toàn Scrum Team chịu trách nhiệm tạo Increment có giá trị.',
     ARRAY['sprint', 'product-owner', 'developers', 'scope', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 28
    (q28, 'PSM-I',
     'Who has the final say on the order of the Product Backlog?',
     'The Product Owner is the sole person responsible for ordering the Product Backlog. Others may influence by suggesting trade-offs, but the final decision belongs to the Product Owner.',
     'Product Owner là người DUY NHẤT chịu trách nhiệm sắp xếp Product Backlog. Người khác có thể góp ý về trade-off, nhưng quyết định cuối cùng thuộc về Product Owner — không phải CEO, Scrum Master, Developers hay stakeholders.',
     ARRAY['product-owner', 'product-backlog', 'ordering', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 29 (true/false)
    (q29, 'PSM-I',
     'True or False: It is mandatory that the product Increment be released to production at the end of each Sprint.',
     'The product Increment should be usable at the end of every Sprint, but it does not have to be released. Release decisions belong to the Product Owner based on business needs.',
     'Increment phải SỬ DỤNG ĐƯỢC vào cuối mỗi Sprint, nhưng KHÔNG bắt buộc phải release lên production. Quyết định release thuộc về Product Owner dựa trên nhu cầu kinh doanh.',
     ARRAY['increment', 'release', 'true-false', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted'),

    -- 30
    (q30, 'PSM-I',
     'The Product Backlog is ordered by:',
     'The Product Owner is accountable for effective Product Backlog management. The Product Backlog is an emergent, ordered list of what is needed to improve the product. It is the single source of work undertaken by the Scrum Team. The Product Owner orders it however they deem most appropriate.',
     'Product Owner chịu trách nhiệm quản lý hiệu quả Product Backlog. Đây là danh sách nổi-lên (emergent) và có thứ tự về những gì cần để cải thiện sản phẩm. Product Owner sắp xếp theo cách họ thấy phù hợp nhất — không bị ràng buộc theo rủi ro, kích thước hay giá trị đơn thuần.',
     ARRAY['product-backlog', 'product-owner', 'ordering', 'scrum-open-pool-2'], '{}'::uuid[], 'Scrum Open Assessment', 'trusted');

  -- ────────────────────────────────────────────────────────────
  -- Options
  -- ────────────────────────────────────────────────────────────

  -- Q1: When does a Developer become accountable for the value of a PBI
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q1, 'During the Daily Scrum.', false, 0),
    (gen_random_uuid(), q1, 'Whenever a team member can accommodate more work.', false, 1),
    (gen_random_uuid(), q1, 'Never. The entire Scrum Team is accountable for creating value every Sprint.', true, 2),
    (gen_random_uuid(), q1, 'At the Sprint Planning Event.', false, 3);

  -- Q2: Developers should have all the skills needed to
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q2, 'Turn the Product Backlog items they select into an Increment of a useful and valuable product.', true, 0),
    (gen_random_uuid(), q2, 'Complete the project as estimated when the date and cost are committed to the Product Owner.', false, 1),
    (gen_random_uuid(), q2, 'Do all of the development work, except for specialized testing that requires additional tools and environments.', false, 2);

  -- Q3: When should a Developer be replaced
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q3, 'As needed, with no special allowance for changes in productivity.', false, 0),
    (gen_random_uuid(), q3, 'Never, it reduces productivity.', false, 1),
    (gen_random_uuid(), q3, 'As needed, while taking into account a short-term reduction in productivity.', true, 2),
    (gen_random_uuid(), q3, 'Every Sprint to promote shared learning.', false, 3);

  -- Q4: Scrum Master service for the Daily Scrum
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q4, 'Lead the discussions of the Developers.', false, 0),
    (gen_random_uuid(), q4, 'Ensure that all 3 questions have been answered.', false, 1),
    (gen_random_uuid(), q4, 'Facilitate in a way that ensures each team member has a chance to speak.', false, 2),
    (gen_random_uuid(), q4, 'Teach the Developers to keep the Daily Scrum within the 15 minute timebox.', true, 3),
    (gen_random_uuid(), q4, 'All answers apply.', false, 4);

  -- Q5: Sprint Review description
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q5, 'It is a mechanism to control Developer activity during a Sprint.', false, 0),
    (gen_random_uuid(), q5, 'It is a demo at the end of the Sprint for everyone in the organization to check on the work done.', false, 1),
    (gen_random_uuid(), q5, 'It is when the Scrum Team and stakeholders inspect the outcome of a Sprint and figure out what to do next.', true, 2);

  -- Q6: Who creates the Definition of Done
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q6, 'The Product Owner since they are responsible for the product''s success.', false, 0),
    (gen_random_uuid(), q6, 'If it is not an organizational standard, the Scrum Team must create a Definition of Done appropriate for the product.', true, 1),
    (gen_random_uuid(), q6, 'The Scrum Team, in a collaborative effort where the result is the common denominator of all members'' definitions.', false, 2),
    (gen_random_uuid(), q6, 'The Scrum Master since they are responsible for the productivity of the Developers.', false, 3);

  -- Q7: Two ways Scrum Master enables effective teams (multi-select)
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q7, 'By keeping high value features high in the Product Backlog.', false, 0),
    (gen_random_uuid(), q7, 'By starting and ending the meetings at the proper time.', false, 1),
    (gen_random_uuid(), q7, 'By removing impediments that hinder the Scrum Team.', true, 2),
    (gen_random_uuid(), q7, 'By facilitating Developer decision-making.', true, 3);

  -- Q8: Sprint Planning timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q8, 'Whenever it is done.', false, 0),
    (gen_random_uuid(), q8, 'Monthly.', false, 1),
    (gen_random_uuid(), q8, '4 hours.', false, 2),
    (gen_random_uuid(), q8, '8 hours for a monthly Sprint. For shorter Sprints it is usually shorter.', true, 3);

  -- Q9: Main reason Scrum Master at Daily Scrum
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q9, 'They do not have to be there; they only need to ensure the Developers have a Daily Scrum.', true, 0),
    (gen_random_uuid(), q9, 'To gather status and progress information to report to management.', false, 1),
    (gen_random_uuid(), q9, 'To write down any changes to the Sprint Backlog, including adding new items, and tracking progress on the burn-down.', false, 2),
    (gen_random_uuid(), q9, 'To make sure every team member answers the three questions.', false, 3);

  -- Q10: Typical Scrum Team size
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q10, '7 plus or minus 2.', false, 0),
    (gen_random_uuid(), q10, 'Minimum of 7.', false, 1),
    (gen_random_uuid(), q10, '9.', false, 2),
    (gen_random_uuid(), q10, '10 or fewer.', true, 3);

  -- Q11: True/False — Scrum has project manager role
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q11, 'True', false, 0),
    (gen_random_uuid(), q11, 'False', true, 1);

  -- Q12: Who is on the Scrum Team (multi-select, 3)
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q12, 'Developers.', true, 0),
    (gen_random_uuid(), q12, 'Project Manager.', false, 1),
    (gen_random_uuid(), q12, 'The Scrum Master.', true, 2),
    (gen_random_uuid(), q12, 'The Product Owner.', true, 3);

  -- Q13: Meaning of timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q13, 'The event must take at least a minimum amount of time.', false, 0),
    (gen_random_uuid(), q13, 'The event must happen at a set time.', false, 1),
    (gen_random_uuid(), q13, 'The event can take no more than a maximum amount of time.', true, 2),
    (gen_random_uuid(), q13, 'The event must happen by a given time.', false, 3);

  -- Q14: Product Owner responsibility
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q14, 'Keep stakeholders from distracting the Developers.', false, 0),
    (gen_random_uuid(), q14, 'Directing the Developers.', false, 1),
    (gen_random_uuid(), q14, 'Managing the project and ensuring that the work meets the commitments to the stakeholders.', false, 2),
    (gen_random_uuid(), q14, 'Maximizing the value of the work the Scrum Team does.', true, 3);

  -- Q15: Scrum Team consists of (multi-select, 3)
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q15, 'Customers', false, 0),
    (gen_random_uuid(), q15, 'Developers', true, 1),
    (gen_random_uuid(), q15, 'Users', false, 2),
    (gen_random_uuid(), q15, 'Scrum Master', true, 3),
    (gen_random_uuid(), q15, 'Product Owner', true, 4);

  -- Q16: True/False — Must place one improvement in Sprint Backlog
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q16, 'True', false, 0),
    (gen_random_uuid(), q16, 'False', true, 1);

  -- Q17: When does Developer become sole owner of Sprint Backlog item
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q17, 'During the Daily Scrum.', false, 0),
    (gen_random_uuid(), q17, 'Never. All items in the Sprint Backlog are "owned" by the Developers on the Scrum Team.', true, 1),
    (gen_random_uuid(), q17, 'Whenever a team member can accommodate more work.', false, 2),
    (gen_random_uuid(), q17, 'At the Sprint Planning event.', false, 3);

  -- Q18: Who is required to attend the Daily Scrum
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q18, 'The Developers.', true, 0),
    (gen_random_uuid(), q18, 'The Developers and Product Owner.', false, 1),
    (gen_random_uuid(), q18, 'The Scrum Team.', false, 2),
    (gen_random_uuid(), q18, 'The Developers and Scrum Master.', false, 3),
    (gen_random_uuid(), q18, 'The Scrum Master and Product Owner.', false, 4);

  -- Q19: Daily Scrum timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q19, 'The same time of day every day.', false, 0),
    (gen_random_uuid(), q19, '15 minutes.', true, 1),
    (gen_random_uuid(), q19, 'Two minutes per person.', false, 2),
    (gen_random_uuid(), q19, '4 hours.', false, 3),
    (gen_random_uuid(), q19, '15 minutes for a 4-week sprint. For shorter Sprints it is usually shorter.', false, 4);

  -- Q20: How much work must Developers complete per Sprint
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q20, 'As much as it can fit into the Sprint.', false, 0),
    (gen_random_uuid(), q20, 'Enough so that the Increment meets the Definition of Done.', true, 1),
    (gen_random_uuid(), q20, 'All development work and at least some testing.', false, 2),
    (gen_random_uuid(), q20, 'Analysis, design, programming, testing and documentation.', false, 3);

  -- Q21: Sprint Review timebox
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q21, '4 hours for a monthly Sprint. For shorter Sprints it is usually shorter.', true, 0),
    (gen_random_uuid(), q21, '4 hours and longer as needed.', false, 1),
    (gen_random_uuid(), q21, '2 hours.', false, 2),
    (gen_random_uuid(), q21, 'As long as needed.', false, 3),
    (gen_random_uuid(), q21, '1 day.', false, 4);

  -- Q22: Purpose of the Sprint Goal
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q22, 'To lock in the exact set of features the Developers must deliver in the Sprint.', false, 0),
    (gen_random_uuid(), q22, 'To provide a single objective that creates coherence and focus for the Scrum Team.', true, 1),
    (gen_random_uuid(), q22, 'To give management a fixed commitment on what will be done.', false, 2),
    (gen_random_uuid(), q22, 'To replace the Product Backlog for the duration of the Sprint.', false, 3);

  -- Q23: Three incorrect statements about Scrum (multi-select, 3)
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q23, 'Scrum is a methodology where you can pick and choose which parts of Scrum you think will work for your environment.', true, 0),
    (gen_random_uuid(), q23, 'Scrum is a framework for developing and sustaining complex products.', false, 1),
    (gen_random_uuid(), q23, 'Each component of Scrum serves a specific purpose and is essential to your ability to use Scrum to develop complex products.', false, 2),
    (gen_random_uuid(), q23, 'Scrum is like traditional processes but with self-organization to replace Project Managers.', true, 3),
    (gen_random_uuid(), q23, 'Scrum is a framework that eliminates complexity.', true, 4),
    (gen_random_uuid(), q23, 'Scrum is founded on empiricism and lean thinking.', false, 5);

  -- Q24: When might a Sprint be cancelled
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q24, 'When the Sprint Goal becomes obsolete.', true, 0),
    (gen_random_uuid(), q24, 'When the Developers feel that the work is too hard.', false, 1),
    (gen_random_uuid(), q24, 'When the sales department has an important new opportunity.', false, 2),
    (gen_random_uuid(), q24, 'When it becomes clear that not everything will be finished by the end of the Sprint.', false, 3);

  -- Q25: Who should know most about progress toward business objective
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q25, 'The Product Owner', true, 0),
    (gen_random_uuid(), q25, 'The Project Manager', false, 1),
    (gen_random_uuid(), q25, 'The Developers', false, 2),
    (gen_random_uuid(), q25, 'The Scrum Master', false, 3);

  -- Q26: True/False — separate Product Backlog per team
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q26, 'True', false, 0),
    (gen_random_uuid(), q26, 'False', true, 1);

  -- Q27: Who reviews/adjusts PBIs when forecast won't be met
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q27, 'The Developers.', false, 0),
    (gen_random_uuid(), q27, 'The Scrum Master, the project manager, and the Developers', false, 1),
    (gen_random_uuid(), q27, 'The Product Owner and all stakeholders.', false, 2),
    (gen_random_uuid(), q27, 'The Product Owner and the Developers.', true, 3);

  -- Q28: Who has final say on Product Backlog order
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q28, 'The Product Owner.', true, 0),
    (gen_random_uuid(), q28, 'The CEO.', false, 1),
    (gen_random_uuid(), q28, 'The Scrum Master.', false, 2),
    (gen_random_uuid(), q28, 'The Developers.', false, 3),
    (gen_random_uuid(), q28, 'The Stakeholders.', false, 4);

  -- Q29: True/False — Increment must be released to production
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q29, 'True', false, 0),
    (gen_random_uuid(), q29, 'False', true, 1);

  -- Q30: Product Backlog ordered by
  INSERT INTO public.question_options (id, question_id, text, correct, sort_order) VALUES
    (gen_random_uuid(), q30, 'Risk, where safer items are at the top, and riskier items are at the bottom.', false, 0),
    (gen_random_uuid(), q30, 'Items are randomly arranged.', false, 1),
    (gen_random_uuid(), q30, 'Least valuable items at the top to most valuable at the bottom.', false, 2),
    (gen_random_uuid(), q30, 'Size, where small items are at the top and large items are at the bottom.', false, 3),
    (gen_random_uuid(), q30, 'Whatever is deemed most appropriate by the Product Owner.', true, 4);

END $$;
