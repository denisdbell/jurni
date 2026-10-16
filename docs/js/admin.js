/* ------------------------------------------------------------------
   Jurni prototype — admin dashboard
   ------------------------------------------------------------------ */
(function () {
  const { $, $$, jmd, toast, logo, renderStars } = UI;

  $("#sb-brand").innerHTML = logo("light", 24, false);

  const TITLES = {
    "v-overview": "Overview",
    "v-verify": "Verifications",
    "v-users": "Users",
    "v-fares": "Zone fares",
    "v-rides": "Rides & activity",
    "v-alerts": "Emergency alerts",
  };

  /* ---------- navigation ---------- */
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-view]");
    if (!nav) return;
    const id = nav.getAttribute("data-view");
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === id));
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.getAttribute("data-view") === id));
    $("#view-title").textContent = TITLES[id] || "";
    if (id === "v-alerts") renderAlerts(); // refresh in case SOS fired on another tab
  });

  /* ---------- mobile nav drawer ---------- */
  const adminEl = $(".admin");
  const navToggle = $("#nav-toggle");
  const setNav = (open) => {
    adminEl.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  };
  navToggle.addEventListener("click", () => setNav(!adminEl.classList.contains("nav-open")));
  $("#nav-close").addEventListener("click", () => setNav(false));
  $("#nav-backdrop").addEventListener("click", () => setNav(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });
  // Close the drawer once a section is chosen
  document.addEventListener("click", (e) => { if (e.target.closest(".nav-item")) setNav(false); });

  const pill = (text, kind) => `<span class="pill pill--${kind}">${text}</span>`;
  const statusPill = (s) => {
    const map = { Active: "ok", Suspended: "danger", Completed: "ok", "In progress": "warn", Cancelled: "muted", Pending: "warn" };
    return pill(s, map[s] || "muted");
  };

  /* ---------- overview ---------- */
  function renderOverview() {
    const users = Store.get("users");
    const rides = Store.get("rides");
    const verifications = Store.get("verifications");
    const alerts = Store.get("alerts");
    const pending = verifications.filter((v) => v.status === "Pending").length;
    const openAlerts = alerts.filter((a) => !a.acknowledged).length;

    $("#st-users").textContent = users.length;
    $("#st-drivers").textContent = users.filter((u) => u.role === "Driver" && u.status === "Active").length;
    $("#st-rides").textContent = rides.length;
    $("#st-pending").textContent = pending;
    $("#st-alerts").textContent = openAlerts;

    const recent = rides.slice(0, 5);
    $("#tbl-recent").innerHTML = `
      <thead><tr><th>Rider</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${recent.map((r) => `
        <tr><td class="cell-strong">${r.rider}</td><td>${r.driver}</td>
        <td>${r.from} → ${r.to}</td><td>${jmd(r.fare)}</td><td>${statusPill(r.status)}</td>
        <td class="muted">${r.time}</td></tr>`).join("")}</tbody>`;
  }

  /* ---------- verifications ---------- */
  function renderVerify() {
    const list = Store.get("verifications");
    const pending = list.filter((v) => v.status === "Pending");
    $("#verify-count").textContent = `${pending.length} pending`;
    $("#tbl-verify").innerHTML = `
      <thead><tr><th>Applicant</th><th>Role</th><th>Documents</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((v) => `
        <tr data-id="${v.id}">
          <td class="cell-strong">${v.name}</td>
          <td>${v.role}</td>
          <td class="muted">${v.docs}</td>
          <td class="muted">${v.submitted}</td>
          <td>${statusPill(v.status)}</td>
          <td>${v.status === "Pending" ? `
            <div class="table-actions">
              <button class="btn btn--ok btn--sm" data-approve="${v.id}">Approve</button>
              <button class="btn btn--ghost btn--sm" data-reject="${v.id}">Reject</button>
            </div>` : ""}</td>
        </tr>`).join("")}</tbody>`;
  }

  document.addEventListener("click", (e) => {
    const ap = e.target.closest("[data-approve]");
    const rj = e.target.closest("[data-reject]");
    if (!ap && !rj) return;
    const id = (ap || rj).getAttribute(ap ? "data-approve" : "data-reject");
    Store.update((s) => {
      const v = s.verifications.find((x) => x.id === id);
      if (v) v.status = ap ? "Approved" : "Rejected";
    });
    toast(ap ? "Applicant approved" : "Application rejected", ap ? "ok" : "danger");
    renderVerify();
    renderBadges();
    renderOverview();
  });

  /* ---------- users ---------- */
  function renderUsers(filter = "") {
    const q = filter.trim().toLowerCase();
    const rows = Store.get("users").filter(
      (u) => !q || u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
    $("#tbl-users").innerHTML = `
      <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th>Rating</th><th></th></tr></thead>
      <tbody>${rows.map((u) => `
        <tr data-id="${u.id}">
          <td class="cell-strong">${u.name}</td>
          <td>${u.role}</td>
          <td>${statusPill(u.status)}</td>
          <td class="muted">${u.joined}</td>
          <td>${renderStars(u.rating)} <span class="muted small">${u.rating}</span></td>
          <td><button class="btn btn--ghost btn--sm" data-toggle-user="${u.id}">${u.status === "Active" ? "Suspend" : "Reinstate"}</button></td>
        </tr>`).join("")}
        ${rows.length ? "" : `<tr><td colspan="6" class="empty">No matching users</td></tr>`}</tbody>`;
  }
  $("#user-search").addEventListener("input", (e) => renderUsers(e.target.value));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-toggle-user]");
    if (!b) return;
    const id = b.getAttribute("data-toggle-user");
    Store.update((s) => {
      const u = s.users.find((x) => x.id === id);
      if (u) u.status = u.status === "Active" ? "Suspended" : "Active";
    });
    renderUsers($("#user-search").value);
    renderOverview();
    toast("User status updated");
  });

  /* ---------- zone fare matrix ---------- */
  function renderFares() {
    const head = `<thead><tr><th class="rowhead">From \\ To</th>${ZONES.map((z) => `<th>${z}</th>`).join("")}</tr></thead>`;
    const body = ZONES.map((z1, i) => {
      const cells = ZONES.map((z2, j) => {
        if (i === j) return `<td class="diag">—</td>`;
        if (i < j) {
          const val = fareFor(z1, z2) ?? "";
          return `<td><input type="number" data-key="${z1}|${z2}" value="${val}" /></td>`;
        }
        const val = fareFor(z1, z2);
        return `<td class="muted">${val == null ? "—" : val}</td>`;
      }).join("");
      return `<tr><th class="rowhead">${z1}</th>${cells}</tr>`;
    }).join("");
    $("#fare-matrix").innerHTML = head + `<tbody>${body}</tbody>`;
  }
  $("#btn-save-fares").addEventListener("click", () => {
    const fares = {};
    $$("#fare-matrix input[data-key]").forEach((inp) => {
      const n = parseInt(inp.value, 10);
      if (!Number.isNaN(n)) fares[inp.getAttribute("data-key")] = n;
    });
    Store.set("fares", fares);
    renderFares(); // refresh mirrored lower triangle
    toast("Zone fares saved", "ok");
  });

  /* ---------- rides ---------- */
  function renderRides() {
    const rides = Store.get("rides");
    $("#rides-count").textContent = `${rides.length} rides`;
    $("#tbl-rides").innerHTML = `
      <thead><tr><th>Rider</th><th>Driver</th><th>From</th><th>To</th><th>Fare</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${rides.map((r) => `
        <tr><td class="cell-strong">${r.rider}</td><td>${r.driver}</td>
        <td>${r.from}</td><td>${r.to}</td><td>${jmd(r.fare)}</td>
        <td>${statusPill(r.status)}</td><td class="muted">${r.time}</td></tr>`).join("")}</tbody>`;
  }

  /* ---------- emergency alerts ---------- */
  function renderAlerts() {
    const alerts = Store.get("alerts");
    const open = alerts.filter((a) => !a.acknowledged).length;
    $("#alerts-open").textContent = `${open} open`;
    const list = $("#alert-list");
    if (!alerts.length) { list.innerHTML = `<div class="empty">No alerts. 🎉</div>`; return; }
    list.innerHTML = alerts.map((a) => `
      <div class="alert-card ${a.acknowledged ? "ack" : ""}">
        <div class="ic">${a.type === "SOS" ? "🚨" : "⚠️"}</div>
        <div class="grow">
          <div class="row" style="gap:8px">
            <strong>${a.type === "SOS" ? "SOS triggered" : "Activity report"}</strong>
            ${a.acknowledged ? pill("Acknowledged", "muted") : pill("Open", "danger")}
          </div>
          <div class="meta">From: <strong>${a.from}</strong> · ${a.time}</div>
          <div class="meta">Ride: ${a.ride} · Driver/vehicle: ${a.driver}</div>
          <div class="meta">📍 GPS captured: <strong>${a.gps}</strong></div>
          <div class="small" style="margin-top:6px">${a.note}</div>
        </div>
        ${a.acknowledged ? "" : `<button class="btn btn--primary btn--sm" data-ack="${a.id}">Acknowledge</button>`}
      </div>`).join("");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ack]");
    if (!b) return;
    const id = b.getAttribute("data-ack");
    Store.update((s) => { const a = s.alerts.find((x) => x.id === id); if (a) a.acknowledged = true; });
    renderAlerts();
    renderBadges();
    renderOverview();
    toast("Alert acknowledged", "ok");
  });

  /* ---------- badges ---------- */
  function renderBadges() {
    const pending = Store.get("verifications").filter((v) => v.status === "Pending").length;
    const open = Store.get("alerts").filter((a) => !a.acknowledged).length;
    const vb = $("#nav-verify-badge");
    const ab = $("#nav-alert-badge");
    vb.textContent = pending; vb.style.display = pending ? "grid" : "none";
    ab.textContent = open; ab.style.display = open ? "grid" : "none";
  }

  /* ---------- reset ---------- */
  $("#btn-reset").addEventListener("click", () => {
    Store.reset();
    renderAll();
    toast("Demo data reset");
  });

  function renderAll() {
    renderOverview(); renderVerify(); renderUsers(); renderFares();
    renderRides(); renderAlerts(); renderBadges();
  }
  renderAll();
})();
