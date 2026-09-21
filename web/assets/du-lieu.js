// Mô House Calendar — nạp dữ liệu theo đúng tầng quyền của người đang xem.
//
// Quy tắc không được phá (tài liệu mục 13.2): trang công khai CHỈ đọc 3 view
// `public_properties`, `public_units`, `public_availability`. Không gọi `bookings`,
// không gọi `guests`, không gọi `bookings_viewer`. Muốn khách xem thêm trường nào
// thì sửa VIEW bằng một migration mới, không nới quyền bảng gốc.
(function () {
  const { sb, C, vnToday, themThang, dauThang } = Mo;

  // Khách có link chỉ được nhìn trước SO_THANG_CONG_KHAI tháng.
  const khungCongKhai = () => ({
    tu: dauThang(vnToday()),
    den: themThang(dauThang(vnToday()), C.SO_THANG_CONG_KHAI),
  });

  // Xếp căn theo thứ tự nhà rồi tới thứ tự căn. `units.sort` chỉ là thứ tự trong
  // một nhà; nếu xếp theo mình nó thì căn của các nhà cài răng lược và dải tên nhà
  // trên lịch bị lặp lại nhiều lần.
  function sapXepCan(units, props) {
    const thuTuNha = new Map(props.map((p, i) => [p.id, i]));   // props đã order theo sort
    const viTri = (id) => (thuTuNha.has(id) ? thuTuNha.get(id) : 9999);
    return units.slice().sort((a, b) =>
      viTri(a.property_id) - viTri(b.property_id)
      || (a.sort ?? 0) - (b.sort ?? 0)
      || String(a.name).localeCompare(String(b.name), "vi"));
  }

  async function taiDuLieu(me) {
    if (me.congKhai) return taiCongKhai();
    return me.canBook ? taiDayDu() : taiChoNguoiXem();
  }

  // --- Tầng 1: ai có link ---
  async function taiCongKhai() {
    const { tu, den } = khungCongKhai();
    const [rp, ru, ra] = await Promise.all([
      sb.from("public_properties").select("id,title,area_label,kind,listing_type,map_url,sort").order("sort"),
      sb.from("public_units").select("*").order("sort"),
      sb.from("public_availability").select("unit_id,start_date,end_date")
        .lt("start_date", den).gt("end_date", tu),
    ]);
    const props = (rp.data ?? []).map((p) => ({ id: p.id, name: p.title, area_label: p.area_label, sort: p.sort }));
    return {
      nguon: "cong-khai", tu, den,
      props: props,
      units: sapXepCan(ru.data ?? [], props),
      // Cắt bớt phần nằm ngoài khung để không lộ kế hoạch dài hạn ngoài 6 tháng
      bookings: (ra.data ?? []).map((b, i) => ({
        id: null, key: "b" + i, unit_id: b.unit_id,
        start_date: b.start_date < tu ? tu : b.start_date,
        end_date: b.end_date > den ? den : b.end_date,
        status: "ban", guest_name: null,
      })),
      guests: [],
    };
  }

  // --- Tầng 2: thành viên đã duyệt, không được sửa (chủ đầu tư) ---
  async function taiChoNguoiXem() {
    const [rp, ru, rb] = await Promise.all([
      sb.from("properties").select("id,name,area_label,sort").eq("active", true).order("sort"),
      sb.from("units").select("*").eq("active", true).order("sort"),
      sb.from("bookings_viewer").select("*").order("start_date"),
    ]);
    return {
      nguon: "nguoi-xem", tu: null, den: null,
      props: rp.data ?? [], units: sapXepCan(ru.data ?? [], rp.data ?? []),
      bookings: (rb.data ?? []).map((b) => ({ ...b, key: "b" + b.id })),
      guests: [],
    };
  }

  // --- Tầng 3: quản lý và quản trị viên ---
  async function taiDayDu() {
    const [rp, ru, rb, rg] = await Promise.all([
      sb.from("properties").select("id,name,area_label,sort").eq("active", true).order("sort"),
      sb.from("units").select("*").eq("active", true).order("sort"),
      sb.from("bookings").select("*, guests(full_name,phone)").is("deleted_at", null).order("start_date"),
      sb.from("guests").select("id,full_name,phone").order("full_name"),
    ]);
    return {
      nguon: "day-du", tu: null, den: null,
      props: rp.data ?? [], units: sapXepCan(ru.data ?? [], rp.data ?? []),
      bookings: (rb.data ?? []).map((b) => ({
        ...b, key: "b" + b.id,
        guest_name: b.guests?.full_name ?? null,
        guest_phone: b.guests?.phone ?? null,
      })),
      guests: rg.data ?? [],
    };
  }

  // Tên đầy đủ của một căn: "Nhà Trầu — Tầng trên"
  function tenCan(u, props) {
    const p = props.find((x) => x.id === u.property_id);
    return (p ? p.name + " — " : "") + u.name;
  }

  const LOAI_CAN = {
    nguyen_can: "Nguyên căn", studio: "Studio", "1pn": "1 phòng ngủ",
    "2pn": "2 phòng ngủ", "3pn": "3 phòng ngủ", penthouse: "Penthouse",
  };
  // Dòng mô tả ngắn dưới tên căn: "1PN · 3 khách · 70 m²"
  function motaCan(u) {
    const v = [];
    if (u.bedrooms) v.push(u.bedrooms + " PN");
    else if (u.unit_type) v.push(LOAI_CAN[u.unit_type] || u.unit_type);
    if (u.max_guests) v.push(u.max_guests + " khách");
    if (u.area_m2) v.push(Number(u.area_m2) + " m²");
    return v.join(" · ");
  }

  Object.assign(Mo, { taiDuLieu, tenCan, motaCan, LOAI_CAN, khungCongKhai, sapXepCan });
})();
