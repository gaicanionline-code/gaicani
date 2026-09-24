// ── Per-button click-counted ad trigger ──────────────────────────────────
// Each button gets its OWN independent countdown, shown as a small number
// badge in its bottom-right corner — not a shared counter, not a separate
// floating element. ძებნა counts its own clicks; ბლოკი counts its own;
// private chat's send button counts its own. Every Nth click on a button
// opens the ad and that button's own countdown restarts at N.
//
// Must be called SYNCHRONOUSLY, directly inside a real click handler — not
// after an await/fetch/setTimeout — or the browser's popup blocker will
// silently swallow window.open(). Every call site does this correctly.
(function () {
  const AD_URL = "https://omg10.com/4/11150018";
  const AD_EVERY_N = 5;

  // Persisted per browser tab so a reload mid-session doesn't reset someone
  // back to a full count. Each button gets its own sessionStorage key.
  function getCount(storageKey) {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw !== null) return parseInt(raw, 10) || 0;
    } catch (_) {}
    return 0;
  }
  function saveCount(storageKey, n) {
    try { sessionStorage.setItem(storageKey, String(n)); } catch (_) {}
  }

  // Creates (once) or reuses a small number badge pinned to the button's
  // own bottom-right corner. The button must have (or gets given) its own
  // stacking context — position:relative — so the badge anchors to IT,
  // not to some distant positioned ancestor.
  function ensureButtonBadge(btnEl, badgeId) {
    let badge = document.getElementById(badgeId);
    if (badge) return badge;

    const computedPos = window.getComputedStyle(btnEl).position;
    if (computedPos === "static") btnEl.style.position = "relative";

    badge = document.createElement("span");
    badge.id = badgeId;
    badge.className = "ad-click-badge";
    badge.title = "რეკლამამდე დარჩენილი დაწკაპუნებები";
    btnEl.appendChild(badge);
    return badge;
  }

  function render(badge, remaining) {
    badge.textContent = String(remaining);
  }

  // ── Ad schedule: ads run ONLY 22:00–05:00, Tbilisi time ─────────────────
  // Deliberately Tbilisi time, NOT the device's local time — a Georgian user
  // abroad, or anyone whose phone is set to another timezone, would
  // otherwise get ads at the wrong hours. We take the device's absolute time
  // (network-synced on phones) and convert it to Asia/Tbilisi.
  const AD_HOURS_START = 22; // inclusive — ads switch on at 22:00:00
  const AD_HOURS_END   = 5;  // exclusive — ads switch off at 05:00:00
  let tbilisiFmt = null;
  try {
    tbilisiFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tbilisi", hour: "2-digit", hourCycle: "h23" });
  } catch (_) { /* very old browser — the fallback below covers it */ }

  function tbilisiHour(ts) {
    if (tbilisiFmt) {
      try {
        const part = tbilisiFmt.formatToParts(new Date(ts)).find(p => p.type === "hour");
        const h = part ? parseInt(part.value, 10) : NaN;
        if (!isNaN(h)) return h % 24; // % 24 guards engines that print midnight as "24"
      } catch (_) { /* fall through */ }
    }
    // Fallback: Georgia is UTC+4 all year (no daylight saving since 2005).
    return (new Date(ts).getUTCHours() + 4) % 24;
  }

  // The window crosses midnight, so it's "22:00 or later, OR before 05:00".
  function isAdHours(ts) {
    const h = tbilisiHour(typeof ts === "number" ? ts : Date.now());
    return h >= AD_HOURS_START || h < AD_HOURS_END;
  }
  window.isAdHours = isAdHours;

  // Exempt from ads entirely — no countdown shown, no ad ever fires — when
  // it's OUTSIDE ad hours (for everyone), or the user is pro, or is inside a
  // 24h ad-free window earned by scoring 20+ in Flappy Bird. Checked here so
  // every call site (present and future) benefits without its own guard.
  // The ad-free window's end time comes from the server (adFreeUntil in the
  // auth payload), so reloading or editing localStorage can't fake it.
  function isAdExempt() {
    if (!isAdHours()) return true; // daytime in Tbilisi — nobody sees ads
    const u = window.gaicaniAuthUser;
    if (!u) return false;
    if (u.isPro) return true;
    return typeof u.adFreeUntil === "number" && u.adFreeUntil > Date.now();
  }
  // Exposed so other pages (e.g. Flappy Bird's pre-round ad gate) apply the
  // exact same rule instead of re-implementing it.
  window.isAdExempt = isAdExempt;

  // Opens the ad in a new tab. Same URL as the click-counter above — kept
  // here so it's defined in exactly one place. MUST be called directly
  // inside a real click handler, or the popup blocker will swallow it.
  window.openAdNow = function () {
    window.open(AD_URL, "_blank", "noopener");
  };

  // Call inside a real click handler. `storageKey` must be UNIQUE per
  // button (each button counts independently); `badgeId` names that
  // button's own badge; `btnEl` is the button the badge attaches to.
  window.registerAdClick = function (storageKey, badgeId, btnEl) {
    if (isAdExempt()) {
      // Make sure no stale badge/number lingers from before they went pro.
      const existing = document.getElementById(badgeId);
      if (existing) existing.remove();
      return;
    }
    let count = getCount(storageKey) + 1;
    const badge = ensureButtonBadge(btnEl, badgeId);

    if (count >= AD_EVERY_N) {
      // This click completes THIS button's own set of N — fire the ad,
      // synchronously, so the browser still treats it as a direct result
      // of the user's click. Then this button's countdown restarts.
      window.open(AD_URL, "_blank", "noopener");
      count = 0;
      render(badge, AD_EVERY_N);
    } else {
      render(badge, AD_EVERY_N - count);
    }
    saveCount(storageKey, count);
  };

  // Draws a button's badge at its current count without incrementing —
  // used once on page load so it shows the right number before any click.
  // Each button is remembered so the schedule check below can redraw its
  // badge when ad hours begin while the page is already open.
  const initializedButtons = [];
  window.initAdCountdown = function (storageKey, badgeId, btnEl) {
    if (!initializedButtons.some(b => b.badgeId === badgeId)) {
      initializedButtons.push({ storageKey, badgeId, btnEl });
    }
    if (isAdExempt()) return; // no badge at all when exempt (daytime, pro, ad-free)
    const count = getCount(storageKey);
    const badge = ensureButtonBadge(btnEl, badgeId);
    render(badge, AD_EVERY_N - count);
  };

  // initAdCountdown runs on page load, before the socket has finished
  // authenticating — so a pro user can briefly see a stale badge rendered
  // under the assumption they weren't pro yet. Call this once isPro becomes
  // known (after auth completes, or right after an admin grants it live) to
  // sweep any badge that was drawn too early.
  window.clearAdBadgesIfPro = function () {
    if (!isAdExempt()) return;
    document.querySelectorAll(".ad-click-badge").forEach(b => b.remove());
  };

  // ── Watch for ads switching on/off while the page stays open ───────────
  // Badges are otherwise only drawn once at load, so someone who opened the
  // chat at 21:50 wouldn't get them at 22:00, and night-time badges would
  // linger past 05:00. Checked every 30s; on a change it clears or redraws
  // the badges, and fires "ads:scheduleChanged" so other pages (Flappy
  // Bird's start screen) can refresh too.
  let lastExempt = isAdExempt();
  function checkAdSchedule() {
    const exempt = isAdExempt();
    if (exempt === lastExempt) return;
    lastExempt = exempt;
    if (exempt) {
      document.querySelectorAll(".ad-click-badge").forEach(b => b.remove());
    } else {
      initializedButtons.forEach(b => window.initAdCountdown(b.storageKey, b.badgeId, b.btnEl));
    }
    try { window.dispatchEvent(new Event("ads:scheduleChanged")); } catch (_) {}
  }
  window.checkAdSchedule = checkAdSchedule; // exposed so pages/tests can trigger a check
  setInterval(checkAdSchedule, 30000);
})();
