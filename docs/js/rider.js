/* ------------------------------------------------------------------
   Jurni prototype — rider flow
   ------------------------------------------------------------------ */
(function () {
  const { $, $$, jmd, toast, showScreen, wireNav, wireModals, closeModal,
          wireStarInput, captureGps, nowLabel, logo, renderStars } = UI;

  /* Brand marks */
  $("#sb-brand").innerHTML = logo("light", 15, false);
  $("#login-brand").innerHTML = logo("light", 26, true);

  wireNav(document);
  wireModals();

  /* Current trip being built */
  const trip = { fromLabel: null, fromZone: null, toLabel: null, toZone: null, fare: null, driver: null };
  let ratingValue = 0;
  let distTimer = null;

  /* ---------- OTP auto-advance ---------- */
  const otpInputs = $$("#otp-boxes input");
  otpInputs.forEach((inp, i) => {
    inp.addEventListener("input", () => {
      if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
    });
  });
  $("#in-phone").addEventListener("input", (e) => {
    $("#otp-dest").textContent = e.target.value || "your number";
  });

  /* ---------- ID upload (simulated) ---------- */
  $("#btn-upload-id").addEventListener("click", () => {
    const tile = $("#id-tile");
    tile.classList.add("done");
    $("#id-status").textContent = "government-id.jpg · pending review";
    $("#id-tile .ic").textContent = "✅";
    $("#btn-upload-id").textContent = "Replace";
    toast("ID uploaded — pending admin review", "ok");
  });

  /* ---------- finish setup ---------- */
  $("#btn-finish-setup").addEventListener("click", () => {
    RIDER.emergencyContact = `${$("#in-ec-name").value} · ${$("#in-ec-phone").value}`;
    toast("Account ready");
    showScreen("scr-home");
  });

  /* ---------- pickup / destination typeaheads ---------- */
  const fromTA = UI.makeTypeahead($("#ta-from"), {
    items: LOCATIONS, placeholder: "Pickup location", onSelect: refreshHomeFare,
  });
  const toTA = UI.makeTypeahead($("#ta-to"), {
    items: LOCATIONS, placeholder: "Where to?", onSelect: refreshHomeFare,
  });
  // sensible defaults so a fare shows immediately (still editable)
  fromTA.setValue("Emancipation Park", { name: "Emancipation Park", zone: "New Kingston" });
  toTA.setValue("UWI Mona", { name: "UWI Mona", zone: "Papine" });

  function refreshHomeFare() {
    const a = fromTA && fromTA.selected, b = toTA && toTA.selected;
    const el = $("#home-fare");
    const btn = $("#btn-request");
    if (!a || !b) {
      el.textContent = "Choose pickup & destination";
      el.style.fontSize = "18px";
      btn.disabled = true;
      return;
    }
    el.textContent = jmd(zoneFare(a.zone, b.zone));
    el.style.fontSize = "";
    btn.disabled = false;
  }
  refreshHomeFare();

  /* ---------- use current location (GPS) for pickup ---------- */
  $("#btn-gps").addEventListener("click", () => {
    const btn = $("#btn-gps");
    if (!navigator.geolocation) { toast("Location isn't available on this device"); return; }
    btn.disabled = true; btn.textContent = "📍 Locating…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const z = nearestZone(pos.coords.latitude, pos.coords.longitude);
        fromTA.setValue(`📍 Current location (near ${z})`, { name: "Current location", zone: z });
        btn.disabled = false; btn.textContent = "📍 Use my current location";
        toast(`Pickup set near ${z}`, "ok");
        refreshHomeFare();
      },
      () => {
        btn.disabled = false; btn.textContent = "📍 Use my current location";
        toast("Couldn't get your location — pick a spot instead", "danger");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  /* ---------- request → fare screen ---------- */
  $("#btn-request").addEventListener("click", () => {
    const a = fromTA.selected, b = toTA.selected;
    if (!a || !b) return;
    trip.fromLabel = a.name; trip.fromZone = a.zone;
    trip.toLabel = b.name; trip.toZone = b.zone;
    trip.fare = zoneFare(a.zone, b.zone);
    $("#fare-from").innerHTML = `${a.name} <span class="tiny muted">(${a.zone})</span>`;
    $("#fare-to").innerHTML = `${b.name} <span class="tiny muted">(${b.zone})</span>`;
    $("#fare-recommended").textContent = jmd(trip.fare);
    $("#in-offer").value = "";
    showScreen("scr-fare");
  });

  /* ---------- find driver → finding → matched ---------- */
  $("#btn-find-driver").addEventListener("click", () => {
    const offer = parseInt($("#in-offer").value, 10);
    if (!Number.isNaN(offer) && offer > 0) {
      trip.fare = offer;
      toast("Offer sent to nearby drivers");
    }
    $("#finding-route").textContent = `${trip.fromLabel} → ${trip.toLabel} · ${jmd(trip.fare)}`;
    showScreen("scr-finding");

    // simulate driver accepting after a short search
    setTimeout(() => {
      trip.driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
      startTrip();
    }, 2600);
  });

  /* ---------- trip screen + distance bar ---------- */
  function startTrip() {
    const d = trip.driver;
    $("#dc-avatar").textContent = d.name[0];
    $("#dc-name").textContent = `${d.name} · ${d.vehicle}`;
    $("#dc-meta").innerHTML = `Plate ${d.plate} · ${renderStars(d.rating)} ${d.rating}`;
    $("#dc-call").href = "tel:" + d.phone.replace(/[^0-9]/g, "");
    $("#trip-fare").textContent = jmd(trip.fare);
    $("#trip-route").textContent = `${trip.fromLabel} → ${trip.toLabel}`;
    $("#trip-status-pill").textContent = "En route";
    $("#trip-status-pill").className = "pill pill--ok";

    showScreen("scr-trip");
    runLeg1();
  }

  /* Leg 1 — driver approaching the pickup */
  function runLeg1() {
    runBar({
      start: 3.0,
      fill: $("#dist-fill"), stateEl: $("#dist-state"), awayEl: $("#dist-away"),
      labels: (km) =>
        km <= 0.05 ? ["Arrived", "At your pickup"]
        : km < 0.4 ? ["Almost there", `~${km.toFixed(1)} km away`]
        : km < 1.5 ? ["Getting closer", `~${km.toFixed(1)} km away`]
        : ["On the way", `~${km.toFixed(1)} km away`],
      onArrive: () => {
        $("#trip-status-pill").textContent = "Arrived";
        $("#trip-status-pill").className = "pill pill--warn";
        toast("Your driver has arrived 🎉", "ok");
        setTimeout(startToDest, 1900);
      },
    });
  }

  /* Leg 2 — riding to the destination */
  function startToDest() {
    const d = trip.driver;
    $("#td-avatar").textContent = d.name[0];
    $("#td-dest").textContent = `Heading to ${trip.toLabel}`;
    $("#td-driver").textContent = `with ${d.name} · ${d.vehicle}`;
    $("#td-route").textContent = `${trip.fromLabel} → ${trip.toLabel}`;
    $("#td-fare").textContent = jmd(trip.fare);
    $("#td-status-pill").textContent = "In trip";
    $("#td-status-pill").className = "pill pill--ok";
    showScreen("scr-todest");

    runBar({
      start: 5.0,
      fill: $("#td-fill"), stateEl: $("#td-state"), awayEl: $("#td-away"),
      labels: (km) =>
        km <= 0.05 ? ["Arrived", "At your destination"]
        : km < 0.6 ? ["Almost there", `~${km.toFixed(1)} km to go`]
        : [`Heading to ${trip.toZone}`, `~${km.toFixed(1)} km to go`],
      onArrive: () => {
        $("#td-status-pill").textContent = "Arrived";
        $("#td-status-pill").className = "pill pill--warn";
        toast("You've reached your destination", "ok");
        setTimeout(goToComplete, 1500);
      },
    });
  }

  /* Generic progress-bar runner (shared by both legs). Steps scale with the
     starting distance so each leg takes a similar amount of time. */
  function runBar({ start, fill, stateEl, awayEl, labels, onArrive }) {
    clearInterval(distTimer);
    let km = start;
    const paint = () => {
      fill.style.width = Math.max(0, Math.min(100, Math.round((1 - km / start) * 100))) + "%";
      const [s, a] = labels(km);
      stateEl.textContent = s; awayEl.textContent = a;
    };
    paint();
    distTimer = setInterval(() => {
      km = Math.max(0, km - (0.26 + Math.random() * 0.16) * (start / 3.0));
      paint();
      if (km <= 0.05) { clearInterval(distTimer); onArrive(); }
    }, 850);
  }

  /* ---------- complete + rate ---------- */
  function goToComplete() {
    $("#complete-fare").textContent = jmd(trip.fare);
    showScreen("scr-complete");
  }

  const rater = wireStarInput($("#rate-driver"), (v) => (ratingValue = v));

  $("#btn-submit-rating").addEventListener("click", () => {
    // record in history (persisted for the admin rides view too)
    Store.update((s) => {
      s.rides.unshift({
        id: "t" + Date.now(),
        rider: RIDER.name,
        driver: trip.driver.name,
        from: trip.fromZone,
        to: trip.toZone,
        fare: trip.fare,
        status: "Completed",
        time: nowLabel(),
      });
    });
    prependHistory({
      id: "h" + Date.now(),
      from: trip.fromLabel, to: trip.toLabel, fare: trip.fare,
      date: "Today", driver: trip.driver.name, rating: ratingValue || 5,
    });
    toast(ratingValue ? `Thanks! You rated ${trip.driver.name} ${ratingValue}★` : "Trip saved", "ok");

    // reset
    ratingValue = 0;
    $("#rate-note").value = "";
    $$("#rate-driver .star").forEach((s) => s.classList.remove("on"));
    showScreen("scr-home");
  });

  /* ---------- history ---------- */
  function rideRow(r) {
    const li = document.createElement("li");
    li.className = "litem";
    li.innerHTML = `
      <div class="avatar" style="background:var(--mint);color:var(--teal-700)">🚗</div>
      <div class="litem__main">
        <div class="litem__title">${r.from} → ${r.to}</div>
        <div class="litem__sub">${r.date} · ${r.driver} · ${renderStars(r.rating)}</div>
      </div>
      <div class="amount">${jmd(r.fare)}</div>`;
    return li;
  }
  function prependHistory(r) { $("#history-list").prepend(rideRow(r)); }
  SEED_HISTORY.forEach((r) => $("#history-list").appendChild(rideRow(r)));

  /* ---------- SOS ---------- */
  $("#sos-alert").addEventListener("click", () => {
    const d = trip.driver;
    const gps = captureGps();
    Store.addAlert({
      id: "a" + Date.now(),
      type: "SOS",
      from: `${RIDER.name} (Rider)`,
      ride: trip.fromLabel && trip.toLabel ? `${trip.fromLabel} → ${trip.toLabel}` : "No active ride",
      driver: d ? `${d.name} · ${d.vehicle} · ${d.plate}` : "—",
      gps,
      note: "SOS triggered during ride." + (RIDER.emergencyContact ? ` Emergency contact (${RIDER.emergencyContact}) notified.` : ""),
      time: nowLabel(),
      acknowledged: false,
    });
    closeModal("sos-modal");
    toast(`Jurni admin alerted · location sent (${gps})`, "danger");
  });

  $("#sos-report").addEventListener("click", () => {
    $("#report-box").classList.remove("hidden");
  });

  $("#sos-report-send").addEventListener("click", () => {
    const note = $("#report-note").value.trim() || "Suspicious activity reported.";
    const d = trip.driver;
    Store.addAlert({
      id: "a" + Date.now(),
      type: "Report",
      from: `${RIDER.name} (Rider)`,
      ride: trip.fromLabel && trip.toLabel ? `${trip.fromLabel} → ${trip.toLabel}` : "No active ride",
      driver: d ? `${d.name} · ${d.vehicle} · ${d.plate}` : "—",
      gps: captureGps(),
      note,
      time: nowLabel(),
      acknowledged: false,
    });
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
