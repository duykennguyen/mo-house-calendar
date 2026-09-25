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
| `web/thu-chi.html` | từ `viewer` trở lên (ghi: `manager`, `admin`) | Ghi chi phí trong tháng và thu khác (điện nước, dịch vụ). Lọc theo tháng và theo nhà |
| `web/bao-cao.html` | từ `viewer` trở lên | Theo lượt khách · theo tháng (lấp đầy, ADR, RevPAR) · **chi phí & lợi nhuận** · tài chính. Xuất Excel có công thức |
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

> ⚠️ **Sửa file trong `assets/` thì phải tăng số sau `?v=` trong cả 4 trang HTML.**
> GitHub Pages cho trình duyệt giữ file JS/CSS trong cache khá lâu, nên nếu không đổi
> đường dẫn thì người dùng sẽ nhận HTML mới kèm JavaScript cũ và trang hỏng. Đã dính
> một lần ngày 21/09/2026.

## Cài đặt — đã làm xong ngày 21/09/2026

1. ✅ Settings → Pages → Source = "GitHub Actions".
2. ✅ Supabase → Authentication → URL Configuration → **Redirect URLs** đã có
   `https://duykennguyen.github.io/mo-house-calendar/**`, nên nút "Tiếp tục bằng Google"
   ngay trên site này quay về đúng chỗ.
3. ✅ Đã bật **xuất bản** cho cả 4 nhà và 10 căn. Tắt từng căn ở trang **Căn & giá**.

Còn thiếu dữ liệu: 6 căn của CamF chưa điền **sức chứa** và **diện tích**, nên dòng mô tả
dưới tên căn chỉ hiện "1 PN". Điền ở trang Căn & giá là đủ, không phải sửa code.

## Màu thanh booking trên lịch (23/09/2026)

| Trạng thái | Màu |
|---|---|
| Đang giữ chỗ | vàng pastel |
| Đã cọc, khách chưa đến | xanh dương pastel |
| Khách đang ở | tím pastel |
| Khách đã trả phòng | đỏ pastel |
| Lịch công khai (không biết trạng thái) | trung tính |

Mã màu nằm trong khối `:root` của `web/assets/style.css`. Nền pastel sáng nên chữ trên
thanh dùng `--muc` chứ không phải trắng.

> Bảng này **khác** với mục 8 của `mo-hub/CLAUDE.md` (sage / nâu / xám) — tài liệu đó viết
> trước, chưa cập nhật theo quyết định ngày 23/09/2026.

## Bốn khoản tiền của một lượt thuê (25/09/2026)

Trước đây "tiền cọc" bị dùng cho hai nghĩa khác hẳn nhau. Nay tách hẳn ra, và mỗi khoản
là một **trục riêng**, không loại trừ nhau — một lượt Airbnb vẫn có thể vừa có cọc bảo đảm
vừa miễn phí tiền phòng.

| Khoản | Cột trong database | Là doanh thu? | Có hoàn lại? | Ai nhập |
|---|---|---|---|---|
| **Đã trả trước** — khách trả trước một phần/toàn bộ tiền phòng | `deposit_amount` + `deposit_status` | Có, trừ thẳng vào hóa đơn | Không | Người nhận booking |
| **Cọc bảo đảm** — giữ để bảo đảm khách ở tử tế | `security_deposit` + `security_deposit_status` | **Không** | Có, sau khi trừ phát sinh | Người nhận booking |
| **Nền tảng thu** — Airbnb/Booking/Agoda thu hộ rồi chuyển khoản về | suy ra từ `channel`, **không có ô nhập** | Có | Không | Tự động theo kênh |
| **Miễn phí tiền phòng** — khách mời, ở thử, đổi dịch vụ | `is_free` | Không (tiền phòng = 0) | — | Công tắc trong form hoặc nút ở màn Thanh toán |

Công thức duy nhất nằm ở `Mo.tinhThanhToan()` trong `web/assets/app.js`, mọi bảng và mọi
sheet Excel đều gọi qua đó nên không bao giờ lệch số:

```
tổng phải thu = tiền phòng (0 nếu miễn phí) + dịch vụ phát sinh
đã thu        = (kênh OTA ? tiền phòng : 0) + đã trả trước + các khoản thu có ngày
còn phải thu  = max(0, tổng phải thu − đã thu)
cọc bảo đảm nằm NGOÀI hóa đơn: không cộng vào "đã thu", không vào doanh thu
```

Lưu ý nghiệp vụ: kênh OTA chỉ thu hộ **tiền phòng**. Dịch vụ phát sinh bán tại chỗ vẫn phải
thu trực tiếp của khách, nên lượt Airbnb có dịch vụ thêm vẫn hiện "còn phải thu".

Quy tắc kiểu PMS: **không đóng được lượt thuê khi khách còn nợ.** Chỉ chặn đúng lúc chuyển
sang "đã trả phòng", không chặn khi sửa một lượt vốn đã đóng từ trước (để dữ liệu cũ nhập
lại vẫn sửa được).

## Cách ghi sổ (22/09/2026)

Mô **tự vận hành trực tiếp**, chấm dứt hợp tác với đơn vị vận hành ngoài. Vì vậy sổ sách
**không còn chia doanh thu 20/80** như bảng Google Sheets cũ, và cũng bỏ cột "Paid by".

```
Lợi nhuận = doanh thu phòng − hoa hồng môi giới + thu khác − chi phí
```

- **Doanh thu phòng** tính vào tháng nào là tuỳ chọn ngay trên tab: tháng khách trả phòng
  (mặc định), tháng khách nhận phòng, phân bổ đều theo đêm, hoặc **tháng thực thu tiền**.
  Cách cuối cùng dùng để đối soát với sao kê ngân hàng: mỗi khoản thu nằm ở tháng có
  `payments.paid_date`, không phụ thuộc ngày khách ở. Vì vậy khoản khách trả trước chỉ điền
  ở form booking (không có ngày thu) sẽ **không** hiện trong cách tính này — muốn khớp sao kê
  thì ghi khoản đó qua nút **Thanh toán** để nó có ngày.
- Lượt **miễn phí tiền phòng** có doanh thu phòng bằng 0 ở mọi bảng, mọi sheet Excel.
- **Thu khác** = điện nước thu lại của khách, dịch vụ bán thêm. Bảng `other_income`.
- **Chi phí** phân loại: quản lý chung · mua tài sản · sửa chữa · điện nước · giặt ủi ·
  lương · hoa hồng · khác. Bảng `expenses`. Chi phí không gắn nhà là "chung cho cả hệ thống"
  và **không** được tính khi đang lọc theo một nhà cụ thể.
- Kênh "Khách trực tiếp lẻ" và "Khách theo tháng" trong báo cáo là cùng kênh trực tiếp,
  phân biệt bằng kiểu thuê ngắn hạn / dài hạn.

Bộ lọc trang Báo cáo mặc định là **tháng đang chạy** và ghi nhớ lựa chọn lần trước trong
`localStorage`, mỗi trang một khóa riêng.

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
