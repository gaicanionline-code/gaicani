// ── Click-counted ad trigger ─────────────────────────────────────────────
// Shared between random chat (ძებნა / დაბლოკვა) and private chat.
// Opens the ad link in a new tab every AD_EVERY_N clicks, with a small
// countdown badge showing how many clicks remain.
//
// Must be called SYNCHRONOUSLY, directly inside a real click handler — not
// after an await/fetch/setTimeout — or the browser's popup blocker will
// silently swallow window.open(). Every call site below does this correctly.
(function () {
  const AD_URL = "https://omg10.com/4/11150018";
  const AD_EVERY_N = 5;

  // Persisted per browser tab (sessionStorage), so a reload mid-chat doesn't
  // quietly reset someone back to a full 5 clicks — but a brand new tab does
  // start fresh, since there's no server-side identity tying counts together
  // and nothing here is meant to track a person across sessions.
  function getCounters(storageKey) {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { count: 0 };
  }
  function saveCounters(storageKey, data) {
    try { sessionStorage.setItem(storageKey, JSON.stringify(data)); } catch (_) {}
  }

  function ensureBadge(badgeId, anchorEl) {
    let badge = document.getElementById(badgeId);
    if (badge) return badge;
    badge = document.createElement("div");
    badge.id = badgeId;
    badge.className = "ad-countdown-badge";
    badge.title = "რეკლამამდე დარჩენილი დაწკაპუნებები";
    if (anchorEl && anchorEl.parentNode) {
      anchorEl.parentNode.insertBefore(badge, anchorEl);
    } else {
      document.body.appendChild(badge);
    }
    return badge;
  }

  function renderBadge(badge, remaining) {
    badge.textContent = "📢 " + remaining;
  }

  // Call this from inside a real click handler. `storageKey` scopes the
  // counter (random chat and private chat count separately); `badgeId` +
  // `anchorEl` control where the countdown shows.
  window.registerAdClick = function (storageKey, badgeId, anchorEl) {
    const data = getCounters(storageKey);
    data.count = (data.count || 0) + 1;

    const badge = ensureBadge(badgeId, anchorEl);
    // Clicks remaining until the next multiple of N (wraps back to N right
    // after firing, since that's the countdown to the *next* ad).
    const untilNext = AD_EVERY_N - (data.count % AD_EVERY_N);

    if (data.count % AD_EVERY_N === 0) {
      // This click IS the Nth — fire the ad now, synchronously, so the
      // browser still treats it as a direct result of the user's click.
      window.open(AD_URL, "_blank", "noopener");
      renderBadge(badge, AD_EVERY_N);
    } else {
      renderBadge(badge, untilNext);
    }
    saveCounters(storageKey, data);
  };

  // Draws the badge at its current count without incrementing — used once
  // on page load so it shows the right number before the first click.
  window.initAdCountdown = function (storageKey, badgeId, anchorEl) {
    const data = getCounters(storageKey);
    const badge = ensureBadge(badgeId, anchorEl);
    const untilNext = AD_EVERY_N - (data.count % AD_EVERY_N);
    renderBadge(badge, untilNext === AD_EVERY_N ? AD_EVERY_N : untilNext);
  };
})();
