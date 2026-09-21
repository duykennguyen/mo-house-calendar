# Mô House Calendar

Lịch đặt phòng cho 10 căn cho thuê của **Mô Đi Phê** tại Hội An.
Tách riêng khỏi [Mô Hub](https://duykennguyen.github.io/mo-hub/) vì lịch là màn hình dùng
nhiều nhất và cần cả bề ngang màn hình, nhưng **dùng chung một dự án Supabase** — cùng bảng,
cùng tài khoản, cùng phân quyền. Không có database riêng.

🔗 https://duykennguyen.github.io/mo-house-calendar/

## Ba tầng người xem

| Ai | Thấy gì |
|---|---|
| **Khách có link** (chưa đăng nhập) | Căn nào trống ngày nào trong 6 tháng tới. Không thấy tên khách, giá thực thu, ghi chú |
| **Chủ đầu tư** (`viewer`) | Lịch đầy đủ, tên khách, giá, cọc, báo cáo. **Không** thấy SĐT/email/giấy tờ khách |
| **Quản lý** (`manager`) | Thêm/sửa booking, khách, thu tiền |
| **Quản trị viên** (`admin`) | Toàn quyền, thêm/bớt căn, hủy, xóa mềm |

Nhân viên (`staff`) không truy cập phần đặt phòng — họ dùng Mô Hub để nhận việc.

Mọi giới hạn ở trên **thực thi trong database bằng RLS**, giao diện chỉ ẩn/hiện nút.
Trang công khai chỉ đọc 3 view `public_properties`, `public_units`, `public_availability`;
không bao giờ gọi bảng gốc.

## Đăng nhập một lần, dùng cả hai site

Mô Hub và Mô House Calendar cùng nằm trên `duykennguyen.github.io` → **cùng origin** →
`supabase-js` đọc chung khóa phiên trong `localStorage`. Ai đã đăng nhập ở Mô Hub thì mở
Calendar là vào thẳng. Điều kiện: cùng `SUPABASE_URL`, cùng publishable key, **không** đổi
`storageKey`. Gắn tên miền riêng cho một trong hai site sẽ làm mất chung phiên.

## Các trang

| File | Ai vào được | Nội dung |
|---|---|---|
| `web/index.html` | ai cũng vào | Lịch ribbon: hàng = căn, cột = ngày/tuần/tháng. Nội dung nở ra theo quyền |
| `web/bao-cao.html` | từ `viewer` trở lên | Theo lượt khách · theo tháng (lấp đầy, ADR, RevPAR) · tài chính. Có xuất CSV |
| `web/khach.html` | `manager`, `admin` | Hồ sơ khách, lịch sử lưu trú, tìm theo tên/điện thoại |
| `web/can-ho.html` | `admin` | Thêm/sửa căn, giá niêm yết, bật/tắt xuất bản ra lịch công khai |

## Cấu trúc

```
web/
├── index.html  bao-cao.html  khach.html  can-ho.html
├── config.js              ← URL Supabase, publishable key, lựa chọn hiển thị công khai
└── assets/
    ├── style.css          ← bảng màu Mô (lấy từ Mô Bedding). Sửa màu ở khối :root
    ├── app.js             ← kết nối Supabase, nhận diện người xem, tiện ích chung
    ├── du-lieu.js         ← nạp dữ liệu đúng theo tầng quyền
    └── lich.js            ← bộ vẽ lịch ribbon
```

HTML/CSS/JS thuần, `supabase-js` UMD qua CDN jsdelivr. Không có build step: sửa file, đẩy lên
nhánh `main`, GitHub Actions tự đưa `web/` lên Pages.

## Cài đặt — đã làm xong ngày 21/09/2026

1. ✅ Settings → Pages → Source = "GitHub Actions".
2. ✅ Supabase → Authentication → URL Configuration → **Redirect URLs** đã có
   `https://duykennguyen.github.io/mo-house-calendar/**`, nên nút "Tiếp tục bằng Google"
   ngay trên site này quay về đúng chỗ.
3. ✅ Đã bật **xuất bản** cho cả 4 nhà và 10 căn. Tắt từng căn ở trang **Căn & giá**.

Còn thiếu dữ liệu: 6 căn của CamF chưa điền **sức chứa** và **diện tích**, nên dòng mô tả
dưới tên căn chỉ hiện "1 PN". Điền ở trang Căn & giá là đủ, không phải sửa code.

## Lựa chọn đang áp dụng (21/09/2026)

- Lịch công khai cho xem trước **6 tháng**, đổi ở `SO_THANG_CONG_KHAI` trong `web/config.js`.
- **Không** hiện giá niêm yết cho khách chưa đăng nhập, để đồng bộ với web Mô House đang ghi
  "Liên hệ". Ẩn thật ở tầng database: migration `20260921000004_bo_gia_khoi_view_cong_khai.sql`
  bên repo `mo-hub` đã bỏ `list_rent_month` / `list_rent_night` khỏi view `public_units`.
  `HIEN_GIA_CONG_KHAI` trong `config.js` giờ chỉ đổi câu chữ — muốn thật sự công khai giá
  thì phải thêm hai cột đó trở lại view bằng một migration mới.
- Lịch công khai hiện **tên căn thật** (Gừng, Tía Tô…). Muốn giấu cơ cấu tòa nhà thì sửa
  `public_units` trả nhãn chung thay cho `units.name`, cũng bằng một migration mới.

## Chưa làm

- **Chặn ngày** (bảo trì, chủ dùng) — cần thêm cột `bookings.is_block` bằng một migration mới.
- **Số đêm tối thiểu**, **giờ nhận/trả phòng** — cần thêm cột ở `units` / `properties`.
- **Xuất iCal** cho Airbnb/Booking đọc lịch bận — cần một Edge Function.
- **Kéo thả đổi ngày** trên lịch — hiện sửa bằng form.
- Cảnh báo hiện trên đầu trang lịch nhưng **chưa tự tạo task** trong Mô Hub.
- So sánh cùng kỳ năm trước trong báo cáo tháng — chờ đủ một năm dữ liệu.

Hồ sơ thiết kế đầy đủ: `docs/MO-HOUSE-CALENDAR.md`.
Quyết định kiến trúc của cả hệ thống: `mo-hub/CLAUDE.md`.
