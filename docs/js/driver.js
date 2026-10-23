/* ------------------------------------------------------------------
   Jurni prototype — driver flow
   ------------------------------------------------------------------ */
(function () {
  const { $, $$, jmd, toast, showScreen, wireNav, wireModals, closeModal,
          wireStarInput, captureGps, nowLabel, logo, renderStars, avatar } = UI;

  const ME = DRIVERS[0]; // the signed-in driver (Marlon)

  $("#sb-brand").innerHTML = logo("light", 15, false);
  $("#login-brand").innerHTML = logo("light", 26, true);

  /* Driver's own profile "photo" — fits them on login & home */
  $("#login-ava").innerHTML = avatar(ME.name, 60, { role: "Driver", badge: "🚗" });
  $("#home-ava").innerHTML = avatar(ME.name, 46, { role: "Driver", verified: true });
  wireNav(document);
  wireModals();

  let activeReq = null;
  let riderRatingValue = 0;
  let erTimer = null;
  let itTimer = null;
  let gpsSharing = true;

  const earnings = [
    { from: "Downtown", to: "Half Way Tree", fare: 700, rider: "Kemar", time: "08:05" },
    { from: "Papine", to: "Liguanea", fare: 500, rider: "Tanya", time: "08:42" },
  ];

  /* ---------- document upload (simulated) ---------- */
  $$("#scr-docs [data-doc]").forEach((tile) => {
    tile.querySelector(".doc-btn").addEventListener("click", () => {
      tile.classList.add("done");
      tile.querySelector(".ic").textContent = "✅";
      tile.querySelector(".doc-status").textContent = "uploaded · pending review";
      tile.querySelector(".doc-btn").textContent = "Replace";
      refreshDocs();
    });
  });
  function refreshDocs() {
    const done = $$("#scr-docs [data-doc].done").length;
    const total = $$("#scr-docs [data-doc]").length;
    $("#docs-overall").textContent =
      done < total ? `${done} of ${total} uploaded.` : "All documents uploaded — ready to submit.";
    $("#btn-submit-docs").disabled = done < total;
  }
  $("#btn-submit-docs").addEventListener("click", () => {
    toast("Submitted — an admin will review your documents", "ok");
    showScreen("scr-pending");
  });

  /* ---------- online / offline ---------- */
  const toggle = $("#online-toggle");
  toggle.addEventListener("change", () => setOnline(toggle.checked));
  function setOnline(on) {
    $("#online-dot").classList.toggle("on", on);
    $("#online-label").textContent = on ? "You're online" : "You're offline";
    $("#online-sub").textContent = on ? "Receiving requests near you" : "Go online to receive ride requests";
    $("#request-list").classList.toggle("hidden", !on);
    $("#offline-empty").classList.toggle("hidden", on);
    if (on) toast("You're online — 3 requests nearby", "ok");
  }

  /* ---------- request list ---------- */
  function renderRequests() {
    const ul = $("#request-list");
    ul.innerHTML = "";
    SEED_REQUESTS.forEach((r) => {
      const li = document.createElement("li");
      li.className = "card";
      li.style.marginBottom = "10px";
      li.style.cursor = "pointer";
      li.innerHTML = `
        <div class="row row--between">
          <div class="row">
            ${avatar(r.rider, 44, { role: "Rider" })}
            <div>
              <div class="bold small">${r.rider} · ${renderStars(r.riderRating)}</div>
              <div class="tiny muted">${r.from} → ${r.to}</div>
            </div>
          </div>
          <div class="amount">${jmd(r.fare)}</div>
        </div>`;
      li.addEventListener("click", () => openRequest(r));
      ul.appendChild(li);
    });
    $("#req-count").textContent = SEED_REQUESTS.length;
  }
  renderRequests();

  function openRequest(r) {
    activeReq = { ...r };
    $("#rq-avatar").innerHTML = avatar(r.rider, 46, { role: "Rider" });
    $("#rq-rider").textContent = r.rider;
    $("#rq-rating").innerHTML = `${renderStars(r.riderRating)} ${r.riderRating}`;
    $("#rq-from").textContent = r.from;
    $("#rq-to").textContent = r.to;
    $("#rq-fare").textContent = jmd(r.fare);
    $("#rq-note").textContent = r.note || "—";
    $("#rq-counter").value = "";
    showScreen("scr-request");
  }

  /* ---------- accept / counter ---------- */
  $("#btn-accept").addEventListener("click", () => { toast("Ride accepted"); goEnroute(); });
  $("#btn-counter").addEventListener("click", () => {
    const c = parseInt($("#rq-counter").value, 10);
    if (!Number.isNaN(c) && c > 0) {
      activeReq.fare = c;
      toast(`Counter sent · ${jmd(c)} — rider accepted`, "ok");
    } else {
      toast("Enter a counter amount first");
      return;
    }
    goEnroute();
  });

  /* ---------- en route to pickup ---------- */
  function goEnroute() {
    $("#er-avatar").innerHTML = avatar(activeReq.rider, 46, { role: "Rider" });
    $("#er-rider").textContent = activeReq.rider;
    $("#er-route").textContent = `${activeReq.from} → ${activeReq.to}`;
    $("#er-fare").textContent = jmd(activeReq.fare);
    $("#er-call").href = "tel:8765550199";
    $("#gps-toggle").checked = true;
    gpsSharing = true;
    $("#btn-start-trip").disabled = true;
    showScreen("scr-enroute");
    runPickupBar();
  }

  $("#gps-toggle").addEventListener("change", (e) => {
    gpsSharing = e.target.checked;
    if (gpsSharing) { toast("Sharing your position", "ok"); runPickupBar(); }
    else { clearInterval(erTimer); $("#er-state").textContent = "GPS paused"; toast("GPS sharing paused"); }
  });

  function runPickupBar() {
    clearInterval(erTimer);
    let km = parseFloat(($("#er-away").textContent.match(/[\d.]+/) || [2.5])[0]);
    if (!km || km <= 0) km = 2.5;
    const fill = $("#er-fill");
    const stateEl = $("#er-state");
    const awayEl = $("#er-away");
    const START = 2.5;

    const paint = () => {
      const pct = Math.max(0, Math.min(100, Math.round((1 - km / START) * 100)));
      fill.style.width = pct + "%";
      if (km <= 0.05) { stateEl.textContent = "At pickup"; awayEl.textContent = "Rider is here"; }
      else if (km < 0.4) { stateEl.textContent = "Almost at pickup"; awayEl.textContent = `~${km.toFixed(1)} km away`; }
      else { stateEl.textContent = "Driving to pickup"; awayEl.textContent = `~${km.toFixed(1)} km away`; }
    };
    paint();

    erTimer = setInterval(() => {
      if (!gpsSharing) return;
      km = Math.max(0, km - (0.26 + Math.random() * 0.12));
      paint();
      if (km <= 0.05) {
        clearInterval(erTimer);
        $("#btn-start-trip").disabled = false;
        toast("You've reached the pickup", "ok");
      }
    }, 850);
  }

  /* ---------- in trip: driving the rider to the destination (leg 2) ---------- */
  $("#btn-start-trip").addEventListener("click", () => {
    $("#it-avatar").innerHTML = avatar(activeReq.rider, 46, { role: "Rider" });
    $("#it-dest").textContent = `To ${activeReq.to}`;
    $("#it-rider-sub").textContent = `${activeReq.rider} · ${activeReq.from} → ${activeReq.to}`;
    $("#it-route").textContent = `${activeReq.from} → ${activeReq.to}`;
    $("#it-rider").textContent = activeReq.rider;
    $("#it-fare").textContent = jmd(activeReq.fare);
    showScreen("scr-intrip");
    runDestBar();
  });

  function runDestBar() {
    clearInterval(itTimer);
    let km = 5.0;
    const START = 5.0;
    const fill = $("#it-fill"), stateEl = $("#it-state"), awayEl = $("#it-away");
    const paint = () => {
      fill.style.width = Math.max(0, Math.min(100, Math.round((1 - km / START) * 100))) + "%";
      if (km <= 0.05) { stateEl.textContent = "At destination"; awayEl.textContent = "Arrived"; }
      else if (km < 0.6) { stateEl.textContent = "Almost there"; awayEl.textContent = `~${km.toFixed(1)} km to go`; }
      else { stateEl.textContent = "Driving to destination"; awayEl.textContent = `~${km.toFixed(1)} km to go`; }
    };
    paint();
    itTimer = setInterval(() => {
      km = Math.max(0, km - (0.4 + Math.random() * 0.25));
      paint();
      if (km <= 0.05) { clearInterval(itTimer); toast("You've reached the destination — collect cash", "ok"); }
    }, 850);
  }

  /* ---------- navigation hand-off (Waze / Google Maps) — demo only ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".nav-app");
    if (!b) return;
    toast(`${b.dataset.nav} opens turn-by-turn to the ${b.dataset.navTo} in the live app`);
  });

  /* ---------- complete + rate ---------- */
  $("#btn-complete").addEventListener("click", () => {
    clearInterval(itTimer);
    $("#rate-collected").textContent = jmd(activeReq.fare);
    $("#rate-rider-who").innerHTML =
      `${avatar(activeReq.rider, 52, { role: "Rider" })}` +
      `<div class="bold" style="margin-top:8px">${activeReq.rider}</div>` +
      `<div class="tiny muted">${activeReq.from} → ${activeReq.to}</div>`;
    showScreen("scr-rate");
  });

  wireStarInput($("#rate-rider"), (v) => (riderRatingValue = v));

  $("#btn-finish-trip").addEventListener("click", () => {
    earnings.unshift({
      from: activeReq.from, to: activeReq.to, fare: activeReq.fare,
      rider: activeReq.rider, time: nowLabel().replace("Today ", ""),
    });
    Store.update((s) => {
      s.rides.unshift({
        id: "t" + Date.now(), rider: activeReq.rider, driver: ME.name,
        from: activeReq.from, to: activeReq.to, fare: activeReq.fare,
        status: "Completed", time: nowLabel(),
      });
    });
    toast(riderRatingValue ? `Rated ${activeReq.rider} ${riderRatingValue}★` : "Trip saved", "ok");
    riderRatingValue = 0;
    $$("#rate-rider .star").forEach((s) => s.classList.remove("on"));
    renderEarnings();
    showScreen("scr-home");
  });

  /* ---------- earnings ---------- */
  const DAILY_GOAL = 6000;
  const WEEK = [
    { day: "Mon", amt: 4200 }, { day: "Tue", amt: 5100 },
    { day: "Wed", amt: 3800 }, { day: "Thu", amt: 6400 },
    { day: "Fri", amt: 7200 }, { day: "Sat", amt: 8100 },
  ];

  function renderEarnings() {
    const ul = $("#earn-list");
    ul.innerHTML = "";
    let fares = 0;
    earnings.forEach((e) => {
      fares += e.fare;
      const li = document.createElement("li");
      li.className = "litem";
      li.innerHTML = `
        ${avatar(e.rider, 42, { role: "Rider" })}
        <div class="litem__main">
          <div class="litem__title">${e.from} → ${e.to}</div>
          <div class="litem__sub">🧍 ${e.rider} · ⏱️ ${e.time}</div>
        </div>
        <div class="amount" style="color:var(--ok)">+${jmd(e.fare)}</div>`;
      ul.appendChild(li);
    });

    const tips = Math.round(fares * 0.06);
    const bonus = earnings.length >= 4 ? 800 : earnings.length >= 2 ? 400 : 0;
    const grand = fares + tips + bonus;

    /* hero */
    $("#earn-total").textContent = jmd(fares);
    $("#earn-count").textContent = earnings.length;
    $("#earn-rating").textContent = ME.rating;
    $("#earn-tips").textContent = jmd(tips);

    /* daily goal */
    const pct = Math.min(100, Math.round((fares / DAILY_GOAL) * 100));
    $("#goal-have").textContent = jmd(fares);
    $("#goal-target").textContent = jmd(DAILY_GOAL);
    $("#goal-fill").style.width = pct + "%";
    $("#goal-msg").innerHTML =
      pct >= 100 ? "Goal smashed! 🎉🏆 You're on fire today."
      : pct >= 80 ? "Almost there! 🔥 Just a little more."
      : pct >= 40 ? "Over halfway — keep it up! 💪"
      : "Let's get rolling! 🚗💨";

    /* breakdown */
    $("#brk-fares").textContent = jmd(fares);
    $("#brk-tips").textContent = jmd(tips);
    $("#brk-bonus").textContent = jmd(bonus);
    $("#brk-total").textContent = jmd(grand);

    /* weekly chart — today's live total is appended as the last bar */
    const week = [...WEEK, { day: "Now", amt: fares, active: true }];
    const max = Math.max(...week.map((w) => w.amt), DAILY_GOAL);
    $("#week-total").textContent = jmd(week.reduce((s, w) => s + w.amt, 0));
    $("#week-chart").innerHTML = week.map((w) => {
      const h = Math.max(6, Math.round((w.amt / max) * 100));
      return `<div class="wk ${w.active ? "wk--on" : ""}">
          <span class="wk__val">${(w.amt / 1000).toFixed(1)}k</span>
          <div class="wk__track"><span class="wk__bar" style="height:${h}%"></span></div>
          <span class="wk__day">${w.day}</span>
        </div>`;
    }).join("");

    /* cash out */
    $("#btn-cashout").textContent = `💸 Cash out ${jmd(grand)}`;
  }
  renderEarnings();

  $("#btn-cashout").addEventListener("click", () => {
    toast("Cash-out requested — paid to your account 💸", "ok");
  });

  /* ---------- SOS ---------- */
  function raise(type, note) {
    Store.addAlert({
      id: "a" + Date.now(),
      type,
      from: `${ME.name} (Driver)`,
      ride: activeReq ? `${activeReq.from} → ${activeReq.to}` : "No active trip",
      driver: `${ME.name} · ${ME.vehicle} · ${ME.plate}`,
      gps: captureGps(),
      note,
      time: nowLabel(),
      acknowledged: false,
    });
  }
  $("#sos-alert").addEventListener("click", () => {
    raise("SOS", "Driver triggered SOS during a trip.");
    closeModal("sos-modal");
    toast("Jurni admin alerted · location sent", "danger");
  });
  $("#sos-report").addEventListener("click", () => $("#report-box").classList.remove("hidden"));
  $("#sos-report-send").addEventListener("click", () => {
    raise("Report", $("#report-note").value.trim() || "Unsafe rider reported.");
    $("#report-note").value = "";
    $("#report-box").classList.add("hidden");
    closeModal("sos-modal");
    toast("Report sent to Jurni admin", "danger");
  });

  /* ---------- optional deep-link (#screen-id) ---------- */
  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el && el.classList.contains("screen")) showScreen(el.id);
  }
})();
