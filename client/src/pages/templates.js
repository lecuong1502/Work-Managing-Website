export const BUSINESS_TEMPLATES = [
  {
    id: 1,
    title: "Business Project Management",
    author: "Trello Team",
    shortDesc:
      "Quản lý dự án doanh nghiệp từ ý tưởng đến triển khai với workflow rõ ràng.",
    image:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=80",
    bigImage:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80",

    description:
      "Template quản lý dự án doanh nghiệp theo mô hình Kanban, phù hợp cho cả team nhỏ lẫn công ty lớn.\n\n" +
      "✔ Theo dõi tiến độ các hạng mục quan trọng\n" +
      "✔ Chia nhỏ công việc cho từng thành viên / bộ phận\n" +
      "✔ Ưu tiên nhiệm vụ quan trọng, tránh bỏ sót\n" +
      "✔ Tạo cái nhìn toàn cảnh về dự án trong một bảng duy nhất\n\n" +
      "Bạn có thể dùng board này cho dự án phần mềm, marketing campaign, triển khai sản phẩm mới hoặc bất kỳ dự án nội bộ nào cần theo dõi tiến độ rõ ràng.",

    board: {
      name: "Business Project Dashboard",
      description: "Quản lý dự án tổng hợp theo chuẩn Trello.",
      color: "linear-gradient(135deg, #66a1d2ff, #69bfdcff)",
      visibility: "Private",
    },

    lists: [
      {
        title: "Ideas",
        cards: [
          {
            title: "Brainstorm sản phẩm mới",
            description: "Thu thập ý tưởng từ các phòng ban.",
          },
          {
            title: "Phân tích thị trường",
            description: "Tổng hợp số liệu từ Marketing & Sales.",
          },
        ],
      },
      {
        title: "To Do",
        cards: [
          { title: "Lên kế hoạch Sprint 1", description: "" },
          { title: "Xác định KPI cho dự án", description: "" },
        ],
      },
      {
        title: "In Progress",
        cards: [
          { title: "Xây API Backend", description: "" },
          { title: "Thiết kế UI Dashboard", description: "" },
        ],
      },
      {
        title: "Done",
        cards: [
          { title: "Kickoff meeting", description: "" },
          { title: "Hoàn thiện tài liệu dự án", description: "" },
        ],
      },
    ],
  },

  {
    id: 2,
    title: "CRM Sales Pipeline",
    author: "Crmble CRM",
    shortDesc:
      "Theo dõi khách hàng tiềm năng, trạng thái deal và doanh số kỳ vọng.",
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
    bigImage:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80",

    description:
      "Pipeline CRM đơn giản nhưng cực kỳ hiệu quả cho team bán hàng.\n\n" +
      "✔ Lưu trữ toàn bộ khách hàng tiềm năng (leads)\n" +
      "✔ Biết chính xác mỗi khách đang ở giai đoạn nào trong quy trình bán hàng\n" +
      "✔ Tập trung xử lý các deal quan trọng, sắp chốt\n" +
      "✔ Dễ dàng dự đoán doanh thu dựa trên số lượng deal ở từng cột\n\n" +
      "Rất phù hợp cho đội sales nhỏ, startup hoặc doanh nghiệp mới bắt đầu chuẩn hoá quy trình bán hàng.",

    board: {
      name: "CRM Pipeline",
      description: "Quản lý khách hàng theo từng giai đoạn sale.",
      color: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
      visibility: "Private",
    },

    lists: [
      {
        title: "Leads",
        cards: [
          {
            title: "Khách hàng A",
            description: "Đăng ký tư vấn trên website.",
          },
          { title: "Khách hàng B", description: "Inbox qua Fanpage." },
        ],
      },
      {
        title: "Contacted",
        cards: [
          { title: "Gọi điện tư vấn lần đầu", description: "" },
          { title: "Gửi báo giá chi tiết", description: "" },
        ],
      },
      {
        title: "Negotiation",
        cards: [
          {
            title: "Demo sản phẩm",
            description: "Hẹn demo online qua Zoom.",
          },
        ],
      },
      {
        title: "Won",
        cards: [
          {
            title: "Hợp đồng với khách hàng C",
            description: "Đã ký, chờ triển khai.",
          },
        ],
      },
    ],
  },
];

/*DESIGN  */

export const DESIGN_TEMPLATES = [
  {
    id: 3,
    title: "UI/UX Design Workflow",
    author: "Figma + Trello",
    shortDesc:
      "Quy trình thiết kế UI/UX từ research, wireframes đến bàn giao sản phẩm.",
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80",
    bigImage:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=80",

    description:
      "Template này dành cho team Product / Design muốn chuẩn hoá quy trình UI/UX.\n\n" +
      "✔ Tách riêng từng giai đoạn: Research, Wireframe, UI, Review, Deliver\n" +
      "✔ Dễ dàng nắm được task của từng designer\n" +
      "✔ Phù hợp làm việc chung với Product Owner / Developer\n\n" +
      "Bạn có thể dùng cho website, ứng dụng di động hoặc bất kỳ sản phẩm số nào cần thiết kế trải nghiệm người dùng.",

    board: {
      name: "UI/UX Workflow",
      description: "Quy trình thiết kế UI chuẩn, dễ theo dõi.",
      color: "linear-gradient(135deg, #9333ea, #c084fc)",
      visibility: "Private",
    },

    lists: [
      {
        title: "Research",
        cards: [
          {
            title: "User interview",
            description: "Phỏng vấn 5–10 người dùng.",
          },
          { title: "Persona building", description: "Tạo 2–3 persona chính." },
        ],
      },
      {
        title: "Wireframes",
        cards: [
          { title: "User flow", description: "Vẽ sơ đồ luồng sử dụng." },
          {
            title: "Low-fidelity wireframe",
            description: "Phác thảo layout cơ bản.",
          },
        ],
      },
      {
        title: "UI Design",
        cards: [
          { title: "Thiết kế Design System", description: "" },
          { title: "Thiết kế màn hình chính", description: "" },
        ],
      },
      {
        title: "Review",
        cards: [
          { title: "Review nội bộ team", description: "" },
          { title: "Review với PO/Khách hàng", description: "" },
        ],
      },
      {
        title: "Deliver",
        cards: [
          { title: "Handoff Figma cho dev", description: "" },
          { title: "Chuẩn bị asset export", description: "" },
        ],
      },
    ],
  },

  {
    id: 4,
    title: "Graphic Design Project",
    author: "Trello Creatives",
    shortDesc:
      "Quản lý dự án thiết kế đồ họa từ lúc nhận brief đến khi gửi file final.",
    image:
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80",
    bigImage:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1400&q=80",

    description:
      "Template này cực kỳ hữu ích cho designer freelance, agency hoặc studio nhỏ.\n\n" +
      "✔ Chia nhỏ dự án thành các bước rõ ràng: Brief → Moodboard → Draft → Revision → Final\n" +
      "✔ Dễ theo dõi tình trạng từng job thiết kế\n" +
      "✔ Hạn chế việc quên feedback hoặc gửi thiếu file cho khách\n\n" +
      "Bạn có thể dùng cho thiết kế logo, poster, social post, bao bì sản phẩm, v.v.",

    board: {
      name: "Graphic Design Board",
      description: "Quản lý job thiết kế đồ họa chuyên nghiệp.",
      color: "linear-gradient(135deg, #d8d5d6ff, #bf7693ff)",
      visibility: "Private",
    },

    lists: [
      {
        title: "Client Brief",
        cards: [
          {
            title: "Thu thông tin khách hàng",
            description: "Mục tiêu, đối tượng, thông điệp chính.",
          },
          {
            title: "Xác định tone & style",
            description: "Trẻ trung, tối giản, sang trọng, v.v.",
          },
        ],
      },
      {
        title: "Moodboard",
        cards: [
          {
            title: "Thu thập hình tham khảo",
            description: "Pinterest, Behance, Dribbble,…",
          },
        ],
      },
      {
        title: "Draft",
        cards: [
          {
            title: "Thiết kế bản nháp",
            description: "Gửi 2–3 phương án để khách chọn.",
          },
        ],
      },
      {
        title: "Revision",
        cards: [
          {
            title: "Sửa theo feedback",
            description: "Tối đa 2–3 vòng revision.",
          },
        ],
      },
      {
        title: "Final",
        cards: [
          {
            title: "Giao file hoàn chỉnh",
            description: "PNG/JPG + file gốc AI/PSD/Figma.",
          },
        ],
      },
    ],
  },
];
