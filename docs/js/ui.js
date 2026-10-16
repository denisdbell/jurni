/* ------------------------------------------------------------------
   Jurni prototype — shared UI helpers
   ------------------------------------------------------------------ */

const UI = (function () {
  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- currency ---------- */
  const jmd = (n) => "JMD " + Number(n).toLocaleString("en-JM");

  /* ---------- stars ---------- */
  function starStr(rating) {
    const r = Math.round(rating);
    return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
  }
  function renderStars(rating) {
    return `<span class="stars" aria-label="${rating} stars">${starStr(rating)}</span>`;
  }

  /* ---------- toast ---------- */
  function ensureToastWrap() {
    let w = $(".toast-wrap");
    if (!w) {
      w = document.createElement("div");
      w.className = "toast-wrap";
      document.body.appendChild(w);
    }
    return w;
  }
  function toast(msg, kind = "") {
    const w = ensureToastWrap();
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " toast--" + kind : "");
    t.textContent = msg;
    w.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .3s ease, transform .3s ease";
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
      setTimeout(() => t.remove(), 320);
    }, 2200);
  }

  /* ---------- phone screen navigation ---------- */
  function showScreen(id, root = document) {
    $$(".screen", root).forEach((s) => s.classList.toggle("active", s.id === id));
    const active = $("#" + id, root);
    if (active) active.scrollTop = 0;
  }

  /* Delegated nav: any element with [data-goto] switches screens */
  function wireNav(root = document) {
    root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-goto]");
      if (el && root.contains(el)) {
        showScreen(el.getAttribute("data-goto"), root);
      }
    });
  }

  /* ---------- modal ---------- */
  function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add("open"); }
  function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("open"); }
  function wireModals() {
    $$(".modal").forEach((m) => {
      m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("open"); });
    });
    $$("[data-modal-open]").forEach((b) =>
      b.addEventListener("click", () => openModal(b.getAttribute("data-modal-open")))
    );
    $$("[data-modal-close]").forEach((b) =>
      b.addEventListener("click", () => closeModal(b.getAttribute("data-modal-close")))
    );
  }

  /* ---------- interactive star rating input ---------- */
  function wireStarInput(el, onChange) {
    let value = 0;
    el.classList.add("stars--input");
    el.innerHTML = [1, 2, 3, 4, 5]
      .map((i) => `<span class="star" data-v="${i}">★</span>`)
      .join("");
    const paint = (v) => $$(".star", el).forEach((s) =>
      s.classList.toggle("on", Number(s.dataset.v) <= v));
    el.addEventListener("mouseover", (e) => { const s = e.target.closest(".star"); if (s) paint(Number(s.dataset.v)); });
    el.addEventListener("mouseleave", () => paint(value));
    el.addEventListener("click", (e) => {
      const s = e.target.closest(".star");
      if (!s) return;
      value = Number(s.dataset.v);
      paint(value);
      if (onChange) onChange(value);
    });
    return { get value() { return value; } };
  }

  /* ---------- typeahead ("text drop") ----------
     Builds an input + filtered dropdown inside `wrapper`. Items are
     { name, zone }. Returns a small handle; `.selected` is the chosen item
     (or null if the field was typed but nothing picked). */
  function makeTypeahead(wrapper, { items, placeholder = "", onSelect } = {}) {
    wrapper.classList.add("ta");
    wrapper.innerHTML =
      `<input class="input ta__input" type="text" autocomplete="off" placeholder="${placeholder}" />` +
      `<ul class="ta__menu" hidden></ul>`;
    const input = wrapper.querySelector(".ta__input");
    const menu = wrapper.querySelector(".ta__menu");
    let selected = null, active = -1, filtered = [];

    const paintActive = () =>
      Array.from(menu.children).forEach((li, i) => li.classList.toggle("active", i === active));

    function render(list) {
      filtered = list; active = -1;
      if (!list.length) { menu.hidden = true; menu.innerHTML = ""; return; }
      menu.innerHTML = list
        .map((it, i) => `<li class="ta__opt" data-i="${i}"><span>${it.name}</span><span class="ta__zone">${it.zone}</span></li>`)
        .join("");
      menu.hidden = false;
    }
    function filter(q) {
      q = (q || "").trim().toLowerCase();
      const list = !q
        ? items.slice(0, 8)
        : items.filter((it) => it.name.toLowerCase().includes(q) || it.zone.toLowerCase().includes(q)).slice(0, 8);
      render(list);
    }
    function choose(it) {
      selected = it; input.value = it.name; menu.hidden = true;
      if (onSelect) onSelect(it);
    }

    input.addEventListener("focus", () => filter(input.value));
    input.addEventListener("input", () => { selected = null; filter(input.value); if (onSelect) onSelect(null); });
    input.addEventListener("keydown", (e) => {
      if (menu.hidden) return;
      if (e.key === "ArrowDown") { active = Math.min(active + 1, filtered.length - 1); paintActive(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); paintActive(); e.preventDefault(); }
      else if (e.key === "Enter") { if (active >= 0) { choose(filtered[active]); e.preventDefault(); } }
      else if (e.key === "Escape") { menu.hidden = true; }
    });
    menu.addEventListener("mousedown", (e) => { // mousedown beats input blur
      const li = e.target.closest(".ta__opt");
      if (li) choose(filtered[+li.dataset.i]);
    });
    input.addEventListener("blur", () => setTimeout(() => { menu.hidden = true; }, 120));

    return {
      get selected() { return selected; },
      get value() { return input.value; },
      /* set the field from outside (e.g. GPS), marking an explicit selection */
      setValue(label, item) { input.value = label; selected = item || null; menu.hidden = true; },
      input,
    };
  }

  /* ---------- mock GPS capture (SOS) ----------
     Kingston-ish coordinates with small jitter so each capture differs. */
  function captureGps() {
    const lat = 18.0 + (Math.floor(Math.random() * 400) / 10000);
    const lng = -76.82 + (Math.floor(Math.random() * 500) / 10000);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /* ---------- time label ---------- */
  function nowLabel() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `Today ${hh}:${mm}`;
  }

  /* ---------- the jurni wordmark (inline SVG) ----------
     variant: "light" (on dark teal) | "dark" (on light bg)
     size: pixel height of the wordmark text */
  function logo(variant = "light", size = 26, withTagline = false) {
    const word = variant === "light" ? "#ffffff" : "#0e5a68";
    const accent = "#4fc3d4";
    const tagColor = variant === "light" ? "rgba(234,250,251,.7)" : "#5b7177";
    const motif = `
      <svg width="${size * 1.1}" height="${size * 0.9}" viewBox="0 0 44 36" fill="none" aria-hidden="true" style="margin-bottom:-2px">
        <path d="M9 4c3.3 0 6 2.6 6 5.9 0 4.2-6 9.1-6 9.1S3 14.1 3 9.9C3 6.6 5.7 4 9 4Z" fill="${accent}"/>
        <circle cx="9" cy="9.7" r="2.1" fill="#0a3d47"/>
        <path d="M24 5h13a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-6l-4 4v-4h-3a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z" fill="${accent}" opacity=".9"/>
        <path d="M30 24c6-1 10-5 12-10" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <path d="M40 10l3 4-5 1" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`;
    const tagline = withTagline
      ? `<span style="font-size:${Math.round(size * 0.42)}px;font-weight:600;color:${tagColor};letter-spacing:.01em;margin-left:8px;align-self:center">| Move with ease</span>`
      : "";
    return `<span class="logo" style="font-size:${size}px;color:${word}">
        ${motif}
        <span style="margin-left:2px">jurni</span>
        ${tagline}
      </span>`;
  }

  return {
    $, $$, jmd, starStr, renderStars, toast,
    showScreen, wireNav, openModal, closeModal, wireModals,
    wireStarInput, captureGps, nowLabel, logo, makeTypeahead,
  };
})();
