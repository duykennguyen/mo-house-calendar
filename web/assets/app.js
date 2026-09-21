// Mô House Calendar — phần dùng chung: kết nối Supabase, nhận diện người xem, tiện ích.
//
// Khác Mô Hub một điểm quan trọng: trang này KHÔNG chặn người lạ. Ai có link cũng xem
// được lịch trống/bận (đọc 3 view công khai). Nội dung "nở ra" dần theo quyền.
//
// Phiên đăng nhập: cùng origin với Mô Hub (duykennguyen.github.io) nên supabase-js đọc
// đúng khóa `sb-<ref>-auth-token` trong localStorage. Vì vậy KHÔNG được đổi storageKey,
// và phải giữ nguyên SUPABASE_URL + publishable key như Mô Hub.
(function () {
  const C = window.MO_CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  // ---------- Ngày tháng (múi giờ nghiệp vụ Asia/Ho_Chi_Minh) ----------
  const vnToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const d2iso = (d) => d.toISOString().slice(0, 10);
  const iso2d = (s) => new Date(s + "T00:00:00Z");
  const themNgay = (s, n) => d2iso(new Date(iso2d(s).getTime() + n * 86400e3));
  const themThang = (s, n) => {
    const d = iso2d(s), y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    const cuoi = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();   // ngày cuối của tháng đích
    return d2iso(new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), cuoi))));
  };
  const dauThang = (s) => s.slice(0, 8) + "01";
  const soNgay = (a, b) => Math.round((iso2d(b) - iso2d(a)) / 86400e3);
  const soThang = (a, b) => {
    const x = iso2d(a), y = iso2d(b);
    return (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth());
  };
  const ngayTrongThang = (s) => new Date(Date.UTC(iso2d(s).getUTCFullYear(), iso2d(s).getUTCMonth() + 1, 0)).getUTCDate();
  const ddmm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
  const ddmmyy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
  const nhanThang = (iso) => `T${Number(iso.slice(5, 7))}/${iso.slice(0, 4)}`;
  const when = (ts) => new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

  // ---------- Số & tiền ----------
  const tien = (n) => (n === null || n === undefined || n === "") ? "—" : Math.round(Number(n)).toLocaleString("vi-VN") + " đ";
  const soTu = (v) => { const n = String(v ?? "").replace(/\D/g, ""); return n ? Number(n) : null; };
  const phanTram = (n) => (n === null || !isFinite(n)) ? "—" : (n * 100).toFixed(1).replace(".", ",") + "%";

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Đã chép link"); }
    catch { prompt("Chép link này:", text); }
  }

  // ---------- Xuất CSV (mở được bằng Excel, giữ dấu tiếng Việt) ----------
  function xuatCsv(tenFile, hang) {
    const o = (v) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const noiDung = "﻿" + hang.map((r) => r.map(o).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([noiDung], { type: "text/csv;charset=utf-8" }));
    a.download = tenFile.endsWith(".csv") ? tenFile : tenFile + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Đã tải file CSV");
  }

  // ---------- Đăng nhập ----------
  const veTrang = () => location.origin + location.pathname;

  function hopThoaiDangNhap() {
    let d = $("#dlgVao");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "dlgVao";
      d.innerHTML = `
        <div class="dau"><h3>Đăng nhập</h3><button class="btn chu" data-close>Đóng</button></div>
        <div class="than">
          <p class="muted">Đăng nhập để xem tên khách, giá và báo cáo. Ai đã đăng nhập ở Mô Hub
            trên máy này thì vào thẳng, không phải làm gì thêm.</p>
          <button class="btn chinh" id="vaoGoogle">Tiếp tục bằng Google</button>
          <p class="muted">Lần đầu dùng hệ thống? Đăng ký ở Mô Hub rồi quay lại đây —
            quản trị viên duyệt một lần là dùng được cả hai trang.</p>
          <p><a href="${esc(C.HUB_URL)}">Mở Mô Hub để đăng ký →</a></p>
          <p class="muted" id="vaoMsg"></p>
        </div>`;
      document.body.appendChild(d);
      $("[data-close]", d).onclick = () => d.close();
      $("#vaoGoogle", d).onclick = async () => {
        $("#vaoGoogle").disabled = true;
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google", options: { redirectTo: veTrang() },
        });
        if (error) {
          $("#vaoMsg").textContent = "Không mở được Google: " + error.message +
            " — thử đăng nhập ở Mô Hub rồi quay lại trang này.";
          $("#vaoGoogle").disabled = false;
        }
      };
    }
    d.showModal();
  }

  // ---------- Nhận diện người xem ----------
  // Trả về đối tượng `me` cho mọi trang. Người lạ vẫn có `me`, với role = "anon".
  async function nhanDien() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { role: "anon", congKhai: true };

    let { data: p } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (!p) {  // trigger tạo hồ sơ có độ trễ nhỏ ở lần đăng nhập đầu
      await new Promise((r) => setTimeout(r, 1200));
      ({ data: p } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle());
    }
    if (!p) return { role: "anon", congKhai: true, email: session.user.email, loiHoSo: true };
    if (p.status !== "approved") {
      return { role: "anon", congKhai: true, email: p.email, choDuyet: p.status === "pending", biTuChoi: p.status === "rejected" };
    }
    // staff không truy cập phần đặt phòng (tài liệu mục 3.2) → xem như người có link
    const congKhai = !["admin", "manager", "viewer"].includes(p.role);
    return {
      ...p, congKhai,
      canView: !congKhai,
      canBook: ["admin", "manager"].includes(p.role),
      isAdmin: p.role === "admin",
    };
  }

  const TEN_VAI = { admin: "Quản trị", manager: "Quản lý", staff: "Nhân viên", viewer: "Chỉ xem" };

  function veDauTrang(me) {
    const w = $("#who");
    if (!w) return;
    if (me.role === "anon") {
      w.innerHTML = `<button class="btn nho" id="nutVao">Đăng nhập</button>`;
      $("#nutVao").onclick = hopThoaiDangNhap;
    } else {
      w.innerHTML = `${esc(me.full_name || me.email)} · ${TEN_VAI[me.role] || me.role}
        <button class="btn chu" id="nutRa">Đăng xuất</button>`;
      $("#nutRa").onclick = () => sb.auth.signOut().then(() => location.reload());
    }
    // Chỉ hiện mục điều hướng mà người này vào được
    $$("[data-can]").forEach((el) => {
      const can = el.dataset.can;
      const duoc = can === "xem" ? me.canView : can === "dat" ? me.canBook : me.isAdmin;
      el.classList.toggle("hide", !duoc);
    });
    const dai = $("#daiTrangThai");
    if (dai && me.choDuyet) {
      dai.classList.remove("hide");
      dai.innerHTML = `<b>Đang chờ duyệt.</b> Tài khoản ${esc(me.email)} đã đăng ký nhưng quản trị viên
        chưa duyệt. Trong lúc chờ, bạn vẫn xem được lịch trống như khách.
        <a class="btn nho" href="${esc(C.HUB_URL)}">Mở Mô Hub</a>`;
    } else if (dai && me.biTuChoi) {
      dai.classList.remove("hide");
      dai.innerHTML = `<b>Tài khoản chưa được cấp quyền.</b> Liên hệ quản trị viên nếu bạn cần xem chi tiết.`;
    }
  }

  // Khởi động một trang. `canQuyen`: null (ai cũng vào) | "xem" | "dat" | "admin".
  async function khoiDong(canQuyen, xong) {
    const me = await nhanDien();
    veDauTrang(me);
    const duoc = !canQuyen
      || (canQuyen === "xem" && me.canView)
      || (canQuyen === "dat" && me.canBook)
      || (canQuyen === "admin" && me.isAdmin);
    if (!duoc) {
      const ten = { xem: "thành viên đã được duyệt", dat: "quản trị viên và quản lý", admin: "quản trị viên" }[canQuyen];
      $("#noiDung").innerHTML = `<div class="trong">
        <h2>Mục này dành cho ${ten}</h2>
        <p class="muted">${me.role === "anon" && !me.email
          ? "Đăng nhập để xem, hoặc quay lại trang lịch công khai."
          : "Tài khoản của bạn chưa được cấp quyền xem mục này."}</p>
        <p><a class="btn chinh" href="index.html">Về trang lịch</a>
           ${me.role === "anon" && !me.email ? `<button class="btn" id="vaoNgay">Đăng nhập</button>` : ""}</p>
      </div>`;
      const b = $("#vaoNgay"); if (b) b.onclick = hopThoaiDangNhap;
      return;
    }
    xong(me);
  }

  window.Mo = {
    sb, C, esc, $, $$, toast, copy, xuatCsv, khoiDong, hopThoaiDangNhap,
    vnToday, d2iso, iso2d, themNgay, themThang, dauThang, soNgay, soThang, ngayTrongThang,
    ddmm, ddmmyy, nhanThang, when, tien, soTu, phanTram,
    TEN_VAI,
  };
})();
