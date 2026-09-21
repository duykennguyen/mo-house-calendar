// CẤU HÌNH MÔ HOUSE CALENDAR
// Dùng CHUNG dự án Supabase với Mô Hub — cùng bảng, cùng tài khoản, cùng phân quyền.
// Khóa publishable được phép công khai: dữ liệu đã khóa bằng phân quyền (RLS) trong database.
// TUYỆT ĐỐI không dán service_role key vào đây.
window.MO_CONFIG = {
  SUPABASE_URL: "https://ggxgwbfrmndqslgprcpt.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_m091X2O-FEBQbb_M_TxD2w_jVPw4rHV",

  // Mô Hub cùng origin → phiên đăng nhập dùng chung, không phải đăng nhập lại.
  HUB_URL: "https://duykennguyen.github.io/mo-hub/",
  MO_HOUSE_URL: "https://duykennguyen.github.io/mo-house/",
  LIEN_HE_URL: "https://duykennguyen.github.io/mo-house/lien-he.html",

  // Khách có link chỉ xem được lịch trong ngần này tháng tới (quyết định 21/09/2026).
  SO_THANG_CONG_KHAI: 6,
  // Giá niêm yết tháng: để "Liên hệ" cho đồng bộ với web Mô House (quyết định 21/09/2026).
  HIEN_GIA_CONG_KHAI: false,
};
