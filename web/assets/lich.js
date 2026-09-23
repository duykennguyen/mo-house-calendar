// Mô House Calendar — lịch dạng ribbon.
// Hàng = một căn cho thuê, cột = thời gian chạy ngang, booking là thanh liền mạch
// chạy qua ranh giới tháng. Quy ước ngày [start_date, end_date): ngày trả phòng
// KHÔNG tính đêm đó, nên khách A trả ngày 01/11 và khách B nhận ngày 01/11 là hợp lệ.
(function () {
  const { esc, $, vnToday, iso2d, themNgay, themThang, dauThang, soNgay, soThang, ddmm, ddmmyy } = Mo;

  const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const TRANG_THAI = { giu_cho: "Giữ chỗ", da_coc: "Đã cọc", dang_o: "Đang ở", ket_thuc: "Đã kết thúc", huy: "Đã hủy", ban: "Đã có khách" };
  const KENH = { truc_tiep: "Trực tiếp", moi_gioi: "Môi giới", airbnb: "Airbnb", booking: "Booking.com", agoda: "Agoda", khac: "Khác" };

  // Số cột và bề rộng cột cho từng chế độ xem. Trên điện thoại thu nhỏ lại để vuốt đỡ mỏi.
  const HEP = () => window.matchMedia("(max-width: 760px)").matches;
  const KHUNG = () => HEP()
    ? { ngay: { n: 90, w: 30 }, tuan: { n: 14, w: 60 }, thang: { n: 12, w: 72 } }
    : { ngay: { n: 90, w: 34 }, tuan: { n: 14, w: 78 }, thang: { n: 12, w: 96 } };
  const BUOC = { ngay: 30, tuan: 14, thang: 6 };   // ← → nhảy bao nhiêu

  // Nhận phòng sau 14h, trả phòng trước 12h. Vẽ thanh lệch theo đúng giờ đó:
  // bắt đầu quá giữa ô ngày vào một chút, kết thúc trước giữa ô ngày trả một chút.
  // Nhờ vậy khách trả phòng buổi sáng và khách nhận phòng buổi chiều CÙNG một ngày
  // vẫn nằm cạnh nhau trên cùng một hàng, không đè lên nhau.
  const GIO_VAO = 0.58;    // 14h trên trục 24h, làm tròn cho dễ nhìn
  const GIO_RA = 0.42;     // 12h, lùi một chút để hở khe giữa hai lượt

  function taoLich(opts) {
    const khung = opts.khung;
    let duLieu = { props: [], units: [], bookings: [], tu: null, den: null };
    let cheDo = "ngay", mocDau = vnToday(), loc = "", nhaLoc = "";
    let hep = HEP();

    const rongCot = () => KHUNG()[cheDo].w;
    const soCot = () => KHUNG()[cheDo].n;
    const cotThu = (i) => (cheDo === "thang" ? themThang(mocDau, i) : themNgay(mocDau, i));
    const hetKhung = () => cotThu(soCot());

    // Khách có link chỉ được xem trong khoảng đã cho — không cho kéo ra ngoài.
    function ganMoc(d) {
      if (!duLieu.tu) return d;
      const dai = cheDo === "thang" ? themThang(duLieu.den, -soCot()) : themNgay(duLieu.den, -soCot());
      const tranTren = dai < duLieu.tu ? duLieu.tu : dai;
      if (d < duLieu.tu) return duLieu.tu;
      if (d > tranTren) return tranTren;
      return d;
    }
    const datMoc = (d) => { mocDau = ganMoc(cheDo === "thang" ? dauThang(d) : d); };

    function dsCan() {
      const t = loc.trim().toLowerCase();
      return duLieu.units.filter((u) => {
        if (nhaLoc && u.property_id !== nhaLoc) return false;
        if (!t) return true;
        const p = duLieu.props.find((x) => x.id === u.property_id);
        return (u.name + " " + (p?.name ?? "")).toLowerCase().includes(t);
      });
    }

    // ---------- Vẽ ----------
    function ve() {
      const can = dsCan();
      const n = soCot(), w = rongCot();
      if (!can.length) {
        const loi = duLieu.units.length
          ? "Không có căn nào khớp bộ lọc."
          : (opts.khiTrong?.() ?? "Chưa có căn nào để hiển thị.");
        khung.innerHTML = `<div class="trong">${loi}</div>`;
        capNhatPhamVi();
        return;
      }
      const grid = `grid-template-columns: var(--trai) repeat(${n}, ${w}px)`;
      const homNay = vnToday();
      let html = `<div class="lich-hang dau" style="${grid}"><div class="ten-can"><b>Căn</b></div>`;

      for (let i = 0; i < n; i++) {
        const d = cotThu(i), dt = iso2d(d);
        if (cheDo === "thang") {
          html += `<div class="nhan-ngay"><b>T${dt.getUTCMonth() + 1}</b>${dt.getUTCFullYear()}</div>`;
        } else {
          const cuoi = [0, 6].includes(dt.getUTCDay());
          // Mùng 1 kèm số tháng để biết đang ở tháng nào khi cuộn dài
          const nhan = d.slice(8) === "01" ? `1/${Number(d.slice(5, 7))}` : String(Number(d.slice(8)));
          html += `<div class="nhan-ngay ${cuoi ? "nghi" : ""} ${d === homNay ? "nay" : ""}">${THU[dt.getUTCDay()]}<b>${nhan}</b></div>`;
        }
      }
      html += `</div>`;

      let nhaHienTai = null;
      for (const u of can) {
        const p = duLieu.props.find((x) => x.id === u.property_id);
        if (p && p.id !== nhaHienTai) {
          nhaHienTai = p.id;
          // Dải tên nhà phải rộng bằng cả lịch, nếu không sẽ đứt khi cuộn ngang
          html += `<div class="lich-hang" style="grid-template-columns: var(--trai) ${n * w}px">
            <div class="nha-nhom">${esc(p.name)}${p.area_label ? ` <span class="muted">· ${esc(p.area_label)}</span>` : ""}</div>
            <div class="nha-nhom-nen"></div></div>`;
        }
        const mo = Mo.motaCan(u);
        html += `<div class="lich-hang" style="${grid}">
          <div class="ten-can"><span>${esc(u.name)}</span>${mo ? `<small>${esc(mo)}</small>` : ""}</div>`;
        for (let i = 0; i < n; i++) {
          const d = cotThu(i), dt = iso2d(d);
          const cuoi = cheDo !== "thang" && [0, 6].includes(dt.getUTCDay());
          html += `<div class="o-ngay ${opts.choPhepDat?.() ? "co-the-dat" : ""} ${cuoi ? "nghi" : ""} ${d === homNay ? "nay" : ""}"
            data-unit="${u.id}" data-ngay="${d}"></div>`;
        }
        html += `<div class="lop-thanh" style="left: var(--trai)">${thanhCuaCan(u.id, n, w)}</div></div>`;
      }
      khung.innerHTML = html;
      capNhatPhamVi();
    }

    function thanhCuaCan(unitId, n, w) {
      const het = hetKhung();
      return duLieu.bookings
        .filter((b) => b.unit_id === unitId && b.status !== "huy" && b.start_date < het && b.end_date >= mocDau)
        .map((b) => {
          let x0, x1;                       // toạ độ pixel trong lớp thanh
          if (cheDo === "thang") {
            // Xem theo tháng thì lệch nửa ô là lệch nửa tháng, nên giữ nguyên cách cũ
            const i0 = soThang(mocDau, b.start_date);
            const i1 = soThang(mocDau, themNgay(b.end_date, -1)) + 1;
            x0 = i0 * w + 2; x1 = i1 * w - 2;
          } else {
            x0 = (soNgay(mocDau, b.start_date) + GIO_VAO) * w;
            x1 = (soNgay(mocDau, b.end_date) + GIO_RA) * w;
          }
          const catTrai = x0 < 0, catPhai = x1 > n * w;
          x0 = Math.max(0, x0); x1 = Math.min(n * w, x1);
          if (x1 - x0 < 1) return "";       // nằm trọn ngoài khung nhìn
          const rong = Math.max(x1 - x0, 16);
          const ten = b.guest_name || (b.status === "ban" ? "Đã đặt" : "(chưa ghi tên khách)");
          const bam = b.id ? "bam" : "";
          return `<button class="thanh ${b.status} ${bam} ${catTrai ? "cat-trai" : ""} ${catPhai ? "cat-phai" : ""}"
            ${b.id ? `data-bk="${b.id}"` : ""} data-key="${b.key}"
            style="left:${x0}px; width:${rong}px"><span>${esc(ten)}</span></button>`;
        }).join("");
    }

    function capNhatPhamVi() {
      const el = $("#phamVi");
      if (!el) return;
      const het = cheDo === "thang" ? themThang(mocDau, soCot() - 1) : themNgay(mocDau, soCot() - 1);
      el.textContent = cheDo === "thang"
        ? `${Mo.nhanThang(mocDau)} → ${Mo.nhanThang(het)}`
        : `${ddmmyy(mocDau)} → ${ddmmyy(het)}`;
    }

    // ---------- Thẻ tóm tắt khi rê chuột ----------
    const the = document.createElement("div");
    the.className = "goi-y hide";
    document.body.appendChild(the);
    const anThe = () => the.classList.add("hide");

    function hienThe(b, x, y) {
      const dem = soNgay(b.start_date, b.end_date);
      const dong = [`<b>${esc(b.guest_name || (b.status === "ban" ? "Đã có khách" : "(chưa ghi tên khách)"))}</b>`,
        `${ddmmyy(b.start_date)} → ${ddmmyy(b.end_date)}`];
      dong.push(b.term_type === "dai_han"
        ? `${dem} đêm · dài hạn`
        : `${dem} đêm${b.term_type ? " · ngắn hạn" : ""}`);
      if (b.status !== "ban") dong.push(TRANG_THAI[b.status] ?? b.status);
      if (b.channel) dong.push("Kênh: " + (KENH[b.channel] ?? b.channel));
      the.innerHTML = dong.join("<br>");
      the.classList.remove("hide");
      const r = the.getBoundingClientRect();
      the.style.left = Math.min(x + 12, window.innerWidth - r.width - 10) + "px";
      the.style.top = (y + r.height + 20 > window.innerHeight ? y - r.height - 12 : y + 16) + "px";
    }

    khung.addEventListener("mouseover", (e) => {
      const t = e.target.closest(".thanh");
      if (!t) return anThe();
      const b = duLieu.bookings.find((x) => x.key === t.dataset.key);
      if (b) hienThe(b, e.clientX, e.clientY);
    });
    khung.addEventListener("mouseleave", anThe);
    khung.addEventListener("scroll", anThe, { passive: true });

    khung.addEventListener("click", (e) => {
      const t = e.target.closest(".thanh[data-bk]");
      if (t) { anThe(); return opts.onThanh?.(Number(t.dataset.bk)); }
      const o = e.target.closest(".o-ngay");
      if (o && opts.choPhepDat?.()) opts.onOTrong?.(o.dataset.unit, o.dataset.ngay);
    });

    // Đổi khung điện thoại ↔ máy tính thì vẽ lại cho vừa
    let hen;
    window.addEventListener("resize", () => {
      clearTimeout(hen);
      hen = setTimeout(() => { if (HEP() !== hep) { hep = HEP(); ve(); } }, 200);
    });

    // Cuộn sao cho hôm nay nằm gần mép trái, đỡ phải kéo
    function cuonToiHomNay() {
      const i = cheDo === "thang" ? soThang(mocDau, vnToday()) : soNgay(mocDau, vnToday());
      khung.scrollLeft = Math.max(0, (i - 1) * rongCot());
    }

    return {
      ve,
      datDuLieu(d) { duLieu = d; datMoc(mocDau); },
      datCheDo(m) { cheDo = m; datMoc(vnToday()); ve(); cuonToiHomNay(); },
      datLoc(v) { loc = v; ve(); },
      datNha(v) { nhaLoc = v; ve(); },
      homNay() { datMoc(vnToday()); ve(); cuonToiHomNay(); },
      truoc() { datMoc(cheDo === "thang" ? themThang(mocDau, -BUOC.thang) : themNgay(mocDau, -BUOC[cheDo])); ve(); },
      sau() { datMoc(cheDo === "thang" ? themThang(mocDau, BUOC.thang) : themNgay(mocDau, BUOC[cheDo])); ve(); },
      cuonToiHomNay,
      get cheDo() { return cheDo; },
      get mocDau() { return mocDau; },
    };
  }

  Object.assign(Mo, { taoLich, TRANG_THAI, KENH, THU });
})();
