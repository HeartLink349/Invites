/* ==========================================================================
   MOSTAFA & BASMALA — STANDALONE INTERACTIVE WEDDING INVITATION ENGINE
   - Single editable WEDDING_CONFIG for names, date, venue, photo & WhatsApp
   - Full-screen 5-step 3D champagne envelope unseal -> flap open -> card rise -> unveil
   - Synchronized 1-second real-time countdown with zero-negative celebration banner
   - Real .ics Save-the-Date calendar download & Google Maps directions
   - Honest RSVP form (local preview save + pre-filled WhatsApp delivery)
   - Full English / Arabic (LTR <-> RTL) bilingual experience
   ========================================================================== */
(function () {
  "use strict";

  /* ========================================================================
     1. EDITABLE WEDDING CONFIGURATION
     ======================================================================== */
  const WEDDING_CONFIG = {
    coupleNames: "Mostafa & Basmala",
    weddingDateISO: "2027-08-21T19:00:00+02:00",
    weddingEndISO: "2027-08-22T01:00:00+02:00",
    couplePhoto: "assets/couple-portrait.jpg",

    en: {
      coupleNames: "Mostafa & Basmala",
      pageTitle: "Mostafa & Basmala — Wedding Invitation",
      dateUpper: "SATURDAY, AUGUST 21, 2027",
      dateShort: "AUGUST 21, 2027",
      dateDisplay: "Saturday, August 21, 2027",
      timeDisplay: "7:00 PM",
      dateTimeFull: "Saturday, August 21, 2027 • 7:00 PM",
      venueName: "Royal Palace Hall",
      venueAddressShort: "Nile Corniche, Garden City",
      cityCountry: "Cairo, Egypt",
      venueFullAddress: "Royal Palace Hall, Nile Corniche, Garden City, Cairo, Egypt",
      sched1Time: "7:00 PM",
      sched2Time: "8:00 PM",
      sched3Time: "9:30 PM"
    },
    ar: {
      coupleNames: "مصطفى وبسملة",
      pageTitle: "مصطفى وبسملة — دعوة زفاف",
      dateUpper: "السبت، ٢١ أغسطس ٢٠٢٧",
      dateShort: "٢١ أغسطس ٢٠٢٧",
      dateDisplay: "السبت، ٢١ أغسطس ٢٠٢٧",
      timeDisplay: "٧:٠٠ مساءً",
      dateTimeFull: "السبت، ٢١ أغسطس ٢٠٢٧ • ٧:٠٠ مساءً",
      venueName: "قاعة رويال بالاس",
      venueAddressShort: "كورنيش النيل، جاردن سيتي",
      cityCountry: "القاهرة، مصر",
      venueFullAddress: "قاعة رويال بالاس، كورنيش النيل، جاردن سيتي، القاهرة، مصر",
      sched1Time: "٧:٠٠ مساءً",
      sched2Time: "٨:٠٠ مساءً",
      sched3Time: "٩:٣٠ مساءً"
    },

    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Royal+Palace+Hall+Cairo+Egypt",
    rsvpWhatsAppNumber: "201000000000" // Replace with couple's WhatsApp number (country code, no +)
  };

  let currentLang = "en";
  let envelopeTimers = [];
  let toastTimer = null;

  /* ========================================================================
     2. UTILITIES (Toast & Clipboard)
     ======================================================================== */
  const toastEl = document.getElementById("invToast");
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3000);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(successMsg);
      }).catch(function () {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.className = "sr-copy-buffer";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
    if (ok) {
      showToast(successMsg);
    } else {
      showToast(currentLang === "ar" ? "تعذّر النسخ التلقائي — يرجى النسخ يدويًا" : "Unable to copy automatically — please copy manually");
    }
  }

  function scrollToTopInstant() {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  }

  function isSafeHttpsUrl(url) {
    return typeof url === "string" && /^https:\/\/[^\s]+$/i.test(url.trim());
  }

  /* ========================================================================
     3. APPLY WEDDING CONFIG TO DOM
     ======================================================================== */
  function applyWeddingConfig() {
    const loc = WEDDING_CONFIG[currentLang] || WEDDING_CONFIG.en;
    if (loc.pageTitle) document.title = loc.pageTitle;
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      const key = el.dataset.cfg;
      if (loc[key]) el.textContent = loc[key];
      else if (key === "coupleNames") el.textContent = WEDDING_CONFIG.coupleNames;
    });
    document.querySelectorAll("[data-cfg-src]").forEach(function (img) {
      const key = img.dataset.cfgSrc;
      const src = WEDDING_CONFIG[key];
      if (typeof src === "string" && /^assets\/[a-zA-Z0-9._-]+$/.test(src)) {
        img.src = src;
      }
    });
    const mapsBtn = document.getElementById("btnGoogleMaps");
    if (mapsBtn && isSafeHttpsUrl(WEDDING_CONFIG.googleMapsUrl)) {
      mapsBtn.href = WEDDING_CONFIG.googleMapsUrl;
    }
  }

  /* ========================================================================
     4. CINEMATIC VIDEO COVER TRANSITION & REPLAY
     ======================================================================== */
  const envelopeEntrance = document.getElementById("envelopeEntrance");
  const invitationExperience = document.getElementById("invitationExperience");
  const btnOpenInvitation = document.getElementById("btnOpenInvitation");
  const coverVideoHero = document.getElementById("coverVideoHero");
  const coverVideoAmbient = document.getElementById("coverVideoAmbient");
  const btnHeaderReplay = document.getElementById("btnHeaderReplay");
  const btnDrawerReplay = document.getElementById("btnDrawerReplay");
  const btnFinaleReplay = document.getElementById("btnFinaleReplay");

  function clearTimers() {
    envelopeTimers.forEach(function (id) { clearTimeout(id); });
    envelopeTimers = [];
  }

  function isDesktopAmbientVisible() {
    return !(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
  }

  function ensureCoverVideosPlay() {
    if (coverVideoHero) {
      coverVideoHero.muted = true;
      const pHero = coverVideoHero.play();
      if (pHero && typeof pHero.catch === "function") pHero.catch(function () {});
    }
    if (coverVideoAmbient) {
      if (isDesktopAmbientVisible()) {
        coverVideoAmbient.muted = true;
        const pAmb = coverVideoAmbient.play();
        if (pAmb && typeof pAmb.catch === "function") pAmb.catch(function () {});
      } else if (!coverVideoAmbient.paused) {
        coverVideoAmbient.pause();
      }
    }
  }

  function pauseCoverVideos() {
    [coverVideoHero, coverVideoAmbient].forEach(function (vid) {
      if (vid && !vid.paused) vid.pause();
    });
  }

  function openInvitationCover() {
    if (!envelopeEntrance) return;
    if (envelopeEntrance.dataset.state !== "closed") return;
    clearTimers();

    // Ensure wedding music unlocks smoothly on opening the invitation unless user muted it
    if (typeof startWeddingAudioIfAllowed === "function") {
      startWeddingAudioIfAllowed();
    }

    // Smooth cinematic cross-dissolve into the existing inner invitation
    scrollToTopInstant();
    envelopeEntrance.dataset.state = "exiting";
    envelopeEntrance.setAttribute("inert", "");
    document.body.classList.remove("is-envelope-locked");
    if (invitationExperience) {
      invitationExperience.removeAttribute("inert");
      invitationExperience.classList.add("is-revealed");
      invitationExperience.setAttribute("aria-hidden", "false");
    }

    envelopeTimers.push(setTimeout(function () {
      envelopeEntrance.dataset.state = "hidden";
      pauseCoverVideos();
    }, 900));
  }

  function replayCover() {
    clearTimers();
    closeMobileDrawer();

    scrollToTopInstant();
    document.body.classList.add("is-envelope-locked");
    if (invitationExperience) {
      invitationExperience.setAttribute("inert", "");
      invitationExperience.classList.remove("is-revealed");
      invitationExperience.setAttribute("aria-hidden", "true");
    }
    if (envelopeEntrance) {
      envelopeEntrance.removeAttribute("inert");
      envelopeEntrance.dataset.state = "closed";
    }
    ensureCoverVideosPlay();
  }

  ensureCoverVideosPlay();
  if (btnOpenInvitation) btnOpenInvitation.addEventListener("click", openInvitationCover);
  if (btnHeaderReplay) btnHeaderReplay.addEventListener("click", replayCover);
  if (btnDrawerReplay) btnDrawerReplay.addEventListener("click", replayCover);
  if (btnFinaleReplay) btnFinaleReplay.addEventListener("click", replayCover);

  /* ========================================================================
     5. HEADER SCROLL & MOBILE DRAWER (with Escape + Outside-Click Close)
     ======================================================================== */
  const invHeader = document.querySelector(".inv-header");
  function handleScroll() {
    if (invHeader) invHeader.classList.toggle("is-scrolled", (window.scrollY || 0) > 24);
  }
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  const btnInvMenu = document.getElementById("btnInvMenu");
  const invMobileDrawer = document.getElementById("invMobileDrawer");

  function closeMobileDrawer() {
    if (invMobileDrawer) invMobileDrawer.hidden = true;
    if (btnInvMenu) btnInvMenu.setAttribute("aria-expanded", "false");
  }

  if (btnInvMenu && invMobileDrawer) {
    btnInvMenu.addEventListener("click", function () {
      const open = invMobileDrawer.hidden;
      invMobileDrawer.hidden = !open;
      btnInvMenu.setAttribute("aria-expanded", String(open));
    });
    invMobileDrawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileDrawer);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !invMobileDrawer.hidden) {
        closeMobileDrawer();
        btnInvMenu.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (invMobileDrawer.hidden) return;
      if (invHeader && e.target instanceof Node && !invHeader.contains(e.target)) {
        closeMobileDrawer();
      }
    });
  }

  /* ========================================================================
     6. SYNCHRONIZED 1-SECOND REAL-TIME COUNTDOWN (ZERO NEGATIVES)
     ======================================================================== */
  const targetTimestamp = new Date(WEDDING_CONFIG.weddingDateISO).getTime();
  const mainCountdownGrid = document.getElementById("mainCountdownGrid");
  const mainCelebrateCard = document.getElementById("mainCelebrateCard");
  const coverCountdownGrid = document.getElementById("coverCountdownGrid");
  const coverCelebrateMsg = document.getElementById("coverCelebrateMsg");

  function pad2(num) {
    return String(Math.max(0, Math.floor(num))).padStart(2, "0");
  }

  function toDisplayDigits(str) {
    if (currentLang !== "ar") return str;
    const ar = "٠١٢٣٤٥٦٧٨٩";
    return String(str).replace(/\d/g, function (d) { return ar[Number(d)]; });
  }

  let lastSecondValue = null;

  function updateCountdown() {
    const diff = targetTimestamp - Date.now();

    if (isNaN(targetTimestamp) || diff <= 0) {
      if (mainCountdownGrid) mainCountdownGrid.hidden = true;
      if (mainCelebrateCard) mainCelebrateCard.hidden = false;
      if (coverCountdownGrid) coverCountdownGrid.hidden = true;
      if (coverCelebrateMsg) coverCelebrateMsg.hidden = false;
      return;
    }

    if (mainCountdownGrid) mainCountdownGrid.hidden = false;
    if (mainCelebrateCard) mainCelebrateCard.hidden = true;
    if (coverCountdownGrid) coverCountdownGrid.hidden = false;
    if (coverCelebrateMsg) coverCelebrateMsg.hidden = true;

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const values = {
      days: toDisplayDigits(String(days)),
      hours: toDisplayDigits(pad2(hours)),
      minutes: toDisplayDigits(pad2(minutes)),
      seconds: toDisplayDigits(pad2(seconds))
    };

    document.querySelectorAll("[data-cd]").forEach(function (el) {
      const unit = el.dataset.cd;
      if (values[unit] !== undefined) el.textContent = values[unit];
    });

    if (lastSecondValue !== null && lastSecondValue !== seconds) {
      const mainSec = mainCountdownGrid && mainCountdownGrid.querySelector('[data-cd="seconds"]');
      if (mainSec) {
        mainSec.classList.add("is-ticking");
        setTimeout(function () { mainSec.classList.remove("is-ticking"); }, 180);
      }
    }
    lastSecondValue = seconds;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* Real RFC-5545 .ics Calendar Export (escaped against injection) */
  function toIcsUtc(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function escapeIcsText(str) {
    return String(str || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, " ")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  const btnDownloadCalendar = document.getElementById("btnDownloadCalendar");
  if (btnDownloadCalendar) {
    btnDownloadCalendar.addEventListener("click", function () {
      const safeNames = escapeIcsText(WEDDING_CONFIG.coupleNames);
      const safeLocation = escapeIcsText(WEDDING_CONFIG.en.venueFullAddress);
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Mostafa & Basmala//Wedding Invitation//EN",
        "BEGIN:VEVENT",
        "UID:mostafa-basmala-wedding-2027@wedding-invite",
        "DTSTAMP:" + toIcsUtc(new Date().toISOString()),
        "DTSTART:" + toIcsUtc(WEDDING_CONFIG.weddingDateISO),
        "DTEND:" + toIcsUtc(WEDDING_CONFIG.weddingEndISO),
        "SUMMARY:" + safeNames + " — Wedding Celebration",
        "DESCRIPTION:Together with their families\\, " + safeNames + " invite you to join them in celebrating their marriage.",
        "LOCATION:" + safeLocation,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mostafa-and-Basmala-Wedding.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast(currentLang === "ar" ? "تم تحميل ملف التقويم بنجاح" : "Calendar invite (.ics) downloaded");
    });
  }

  /* ========================================================================
     7. COPY VENUE ADDRESS
     ======================================================================== */
  const btnCopyAddress = document.getElementById("btnCopyAddress");
  if (btnCopyAddress) {
    btnCopyAddress.addEventListener("click", function () {
      const addr = (WEDDING_CONFIG[currentLang] || WEDDING_CONFIG.en).venueFullAddress;
      copyToClipboard(addr, currentLang === "ar" ? "تم نسخ عنوان القاعة" : "Venue address copied to clipboard");
    });
  }

  /* ========================================================================
     8. INTERACTIVE HONEST RSVP FORM (Local Preview Save + WhatsApp Delivery)
     ======================================================================== */
  const RSVP_STORAGE_KEY = "mostafa_basmala_rsvp_v1";
  const rsvpForm = document.getElementById("rsvpForm");
  const guestNameInput = document.getElementById("guestName");
  const guestNameError = document.getElementById("guestNameError");
  const guestCountField = document.getElementById("guestCountField");
  const guestCountInput = document.getElementById("guestCount");
  const guestNoteInput = document.getElementById("guestNote");
  const btnDecGuests = document.getElementById("btnDecGuests");
  const btnIncGuests = document.getElementById("btnIncGuests");
  const rsvpConfirmation = document.getElementById("rsvpConfirmation");
  const rsvpConfirmSummary = document.getElementById("rsvpConfirmSummary");
  const btnSendRsvpWhatsApp = document.getElementById("btnSendRsvpWhatsApp");
  const btnCopyRsvp = document.getElementById("btnCopyRsvp");
  const btnEditRsvp = document.getElementById("btnEditRsvp");

  let lastSavedRsvp = null;

  function syncGuestStepperState() {
    if (!rsvpForm || !guestCountField) return;
    const checked = rsvpForm.querySelector('input[name="attendance"]:checked');
    guestCountField.classList.toggle("is-disabled", Boolean(checked && checked.value === "declining"));
  }

  if (rsvpForm) {
    rsvpForm.querySelectorAll('input[name="attendance"]').forEach(function (radio) {
      radio.addEventListener("change", syncGuestStepperState);
    });
  }

  if (btnDecGuests && guestCountInput) {
    btnDecGuests.addEventListener("click", function () {
      guestCountInput.value = String(Math.max(1, Number(guestCountInput.value || 1) - 1));
    });
  }
  if (btnIncGuests && guestCountInput) {
    btnIncGuests.addEventListener("click", function () {
      guestCountInput.value = String(Math.min(8, Number(guestCountInput.value || 1) + 1));
    });
  }

  function formatRsvpPlainText(entry) {
    if (currentLang === "ar") {
      const status = entry.attendance === "attending"
        ? "تأكيد الحضور بكل سرور (" + entry.guests + " " + (entry.guests === 1 ? "ضيف" : "ضيوف") + ")"
        : "الاعتذار مع خالص التمنيات السعيدة";
      return "تأكيد حضور زفاف " + WEDDING_CONFIG.ar.coupleNames + "\n"
        + "الاسم: " + entry.name + "\n"
        + "الرد: " + status
        + (entry.note ? "\nرسالة للعروسين: " + entry.note : "");
    }
    const status = entry.attendance === "attending"
      ? "Joyfully Accepts (" + entry.guests + " " + (entry.guests === 1 ? "Guest" : "Guests") + ")"
      : "Regretfully Declines (Sending warm wishes)";
    return "Wedding RSVP — " + WEDDING_CONFIG.coupleNames + "\n"
      + "Guest Name: " + entry.name + "\n"
      + "Response: " + status
      + (entry.note ? "\nMessage: " + entry.note : "");
  }

  function renderRsvpConfirmation(entry) {
    if (!entry || !rsvpConfirmation || !rsvpForm) return;
    lastSavedRsvp = entry;
    rsvpForm.hidden = true;
    rsvpConfirmation.hidden = false;

    if (rsvpConfirmSummary) {
      if (currentLang === "ar") {
        rsvpConfirmSummary.textContent = entry.attendance === "attending"
          ? "شكرًا لك يا " + entry.name + " — تم تسجيل تأكيد حضورك (" + entry.guests + " " + (entry.guests === 1 ? "فرد" : "أفراد") + ") محليًا على هذا الجهاز."
          : "شكرًا لك يا " + entry.name + " — تم تسجيل اعتذارك بكل ود محليًا، ونتمنى لك كل الخير.";
      } else {
        rsvpConfirmSummary.textContent = entry.attendance === "attending"
          ? "Thank you, " + entry.name + " — your joyful acceptance for " + entry.guests + " " + (entry.guests === 1 ? "guest" : "guests") + " is prepared below."
          : "Thank you, " + entry.name + " — your kind wishes have been noted below.";
      }
    }

    if (btnSendRsvpWhatsApp) {
      const cleanPhone = String(WEDDING_CONFIG.rsvpWhatsAppNumber || "").replace(/\D/g, "");
      btnSendRsvpWhatsApp.href = "https://wa.me/" + cleanPhone + "?text=" + encodeURIComponent(formatRsvpPlainText(entry));
    }
  }

  if (rsvpForm) {
    rsvpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = (guestNameInput ? guestNameInput.value : "").trim();
      if (name.length < 2) {
        if (guestNameError) {
          guestNameError.textContent = currentLang === "ar"
            ? "يرجى كتابة الاسم الكامل للمدعو قبل تسجيل الرد."
            : "Please enter your full name before recording your response.";
        }
        if (guestNameInput) guestNameInput.focus();
        return;
      }
      if (guestNameError) guestNameError.textContent = "";

      const checked = rsvpForm.querySelector('input[name="attendance"]:checked');
      const attendance = checked ? checked.value : "attending";
      const guests = attendance === "attending" ? Math.max(1, Math.min(8, Number(guestCountInput ? guestCountInput.value : 1))) : 0;
      const note = (guestNoteInput ? guestNoteInput.value : "").trim();

      const entry = { name: name, attendance: attendance, guests: guests, note: note, savedAt: new Date().toISOString() };
      try { localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(entry)); } catch (_) {}
      renderRsvpConfirmation(entry);
      showToast(currentLang === "ar" ? "تم تجهيز ردك محليًا بنجاح" : "RSVP prepared locally in preview");
    });
  }

  if (btnCopyRsvp) {
    btnCopyRsvp.addEventListener("click", function () {
      if (!lastSavedRsvp) return;
      copyToClipboard(formatRsvpPlainText(lastSavedRsvp), currentLang === "ar" ? "تم نسخ نص تأكيد الحضور" : "RSVP text copied to clipboard");
    });
  }

  if (btnEditRsvp) {
    btnEditRsvp.addEventListener("click", function () {
      if (rsvpConfirmation) rsvpConfirmation.hidden = true;
      if (rsvpForm) rsvpForm.hidden = false;
      if (guestNameInput) guestNameInput.focus();
    });
  }

  try {
    const existing = localStorage.getItem(RSVP_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === "object" && typeof parsed.name === "string" && parsed.name.trim()) {
        if (guestNameInput) guestNameInput.value = parsed.name.slice(0, 80);
        if (guestNoteInput && typeof parsed.note === "string") guestNoteInput.value = parsed.note.slice(0, 240);
        if (guestCountInput && Number.isFinite(Number(parsed.guests))) {
          const clamped = Math.max(1, Math.min(8, Math.floor(Number(parsed.guests))));
          guestCountInput.value = String(clamped);
        }
        if (parsed.attendance === "attending" || parsed.attendance === "declining") {
          const radio = rsvpForm && rsvpForm.querySelector('input[name="attendance"][value="' + parsed.attendance + '"]');
          if (radio) radio.checked = true;
        }
        syncGuestStepperState();
      }
    }
  } catch (_) {}

  /* ========================================================================
     9. SCROLL REVEALS (Zero-Lag Pre-Trigger for Tall Mobile Cards)
     ======================================================================== */
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.02, rootMargin: "0px 0px 40px 0px" });
    revealItems.forEach(function (el) { observer.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ========================================================================
     10. BACKGROUND WEDDING AUDIO ENGINE & FLOATING LIQUID GLASS CONTROLLER
     ======================================================================== */
  const weddingAudio = document.getElementById("weddingAudio");
  const floatingAudioBtn = document.getElementById("floatingAudioBtn");
  const floatingAudioLabel = document.getElementById("floatingAudioLabel");

  const TARGET_AUDIO_VOLUME = 0.72;
  let userMutedAudio = false;
  let isFadingOutAudio = false;
  let audioPlayPending = false;
  let wasPlayingBeforeHide = false;
  let audioFadeRaf = null;
  let gestureUnlockAttached = false;

  function cancelAudioFade() {
    if (audioFadeRaf !== null) {
      cancelAnimationFrame(audioFadeRaf);
      audioFadeRaf = null;
    }
  }

  function fadeAudioVolume(toVolume, durationMs, onComplete) {
    if (!weddingAudio) return;
    cancelAudioFade();
    const fromVolume = typeof weddingAudio.volume === "number" ? weddingAudio.volume : 0;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(1, durationMs > 0 ? elapsed / durationMs : 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      weddingAudio.volume = Math.max(0, Math.min(1, fromVolume + (toVolume - fromVolume) * eased));
      if (progress < 1) {
        audioFadeRaf = requestAnimationFrame(step);
      } else {
        audioFadeRaf = null;
        if (typeof onComplete === "function") onComplete();
      }
    }
    audioFadeRaf = requestAnimationFrame(step);
  }

  function updateAudioButtonUI() {
    if (!floatingAudioBtn) return;
    const isPlaying = Boolean(weddingAudio && !weddingAudio.paused && !weddingAudio.ended && !isFadingOutAudio);
    floatingAudioBtn.classList.toggle("is-playing", isPlaying);
    floatingAudioBtn.setAttribute("aria-pressed", String(isPlaying));

    if (currentLang === "ar") {
      floatingAudioBtn.setAttribute("aria-label", isPlaying ? "إيقاف موسيقى الفرح" : "تشغيل موسيقى الفرح");
      if (floatingAudioLabel) floatingAudioLabel.textContent = isPlaying ? "الموسيقى" : "تشغيل";
    } else {
      floatingAudioBtn.setAttribute("aria-label", isPlaying ? "Pause wedding music" : "Play wedding music");
      if (floatingAudioLabel) floatingAudioLabel.textContent = isPlaying ? "Playing" : "Music";
    }
  }

  function removeGestureUnlockListeners() {
    if (!gestureUnlockAttached) return;
    gestureUnlockAttached = false;
    window.removeEventListener("click", handleFirstUserGesture, true);
    window.removeEventListener("touchend", handleFirstUserGesture, true);
    window.removeEventListener("keydown", handleFirstUserGesture, true);
  }

  function startWeddingAudioIfAllowed() {
    if (!weddingAudio || userMutedAudio || audioPlayPending) return;
    isFadingOutAudio = false;
    if (!weddingAudio.paused) {
      fadeAudioVolume(TARGET_AUDIO_VOLUME, 450);
      updateAudioButtonUI();
      removeGestureUnlockListeners();
      return;
    }

    cancelAudioFade();
    weddingAudio.muted = false;
    weddingAudio.volume = 0.02;
    audioPlayPending = true;

    const playPromise = weddingAudio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function () {
        audioPlayPending = false;
        if (userMutedAudio) {
          weddingAudio.pause();
          updateAudioButtonUI();
          return;
        }
        removeGestureUnlockListeners();
        fadeAudioVolume(TARGET_AUDIO_VOLUME, 950);
        updateAudioButtonUI();
      }).catch(function () {
        audioPlayPending = false;
        // Browser blocked unmuted autoplay before first gesture — wait silently for first tap
        attachGestureUnlockListeners();
        updateAudioButtonUI();
      });
    } else {
      audioPlayPending = false;
      removeGestureUnlockListeners();
      fadeAudioVolume(TARGET_AUDIO_VOLUME, 950);
      updateAudioButtonUI();
    }
  }

  function handleFirstUserGesture(event) {
    if (userMutedAudio) {
      removeGestureUnlockListeners();
      return;
    }
    if (floatingAudioBtn && event && event.target instanceof Node && floatingAudioBtn.contains(event.target)) {
      return;
    }
    startWeddingAudioIfAllowed();
  }

  function attachGestureUnlockListeners() {
    if (gestureUnlockAttached || userMutedAudio) return;
    gestureUnlockAttached = true;
    window.addEventListener("click", handleFirstUserGesture, { capture: true });
    window.addEventListener("touchend", handleFirstUserGesture, { capture: true, passive: true });
    window.addEventListener("keydown", handleFirstUserGesture, { capture: true });
  }

  function toggleWeddingAudio() {
    if (!weddingAudio) return;
    if (!weddingAudio.paused && !isFadingOutAudio) {
      userMutedAudio = true;
      isFadingOutAudio = true;
      removeGestureUnlockListeners();
      updateAudioButtonUI();
      fadeAudioVolume(0, 260, function () {
        isFadingOutAudio = false;
        weddingAudio.pause();
        updateAudioButtonUI();
      });
    } else {
      userMutedAudio = false;
      startWeddingAudioIfAllowed();
    }
  }

  if (weddingAudio) {
    weddingAudio.addEventListener("play", updateAudioButtonUI);
    weddingAudio.addEventListener("pause", updateAudioButtonUI);
    weddingAudio.addEventListener("ended", updateAudioButtonUI);
  }
  if (floatingAudioBtn) {
    floatingAudioBtn.addEventListener("click", toggleWeddingAudio);
  }

  // Pause music respectfully if guest minimizes tab/app; softly resume when returning
  document.addEventListener("visibilitychange", function () {
    if (!weddingAudio) return;
    if (document.hidden) {
      wasPlayingBeforeHide = !weddingAudio.paused && !isFadingOutAudio;
      if (wasPlayingBeforeHide) {
        cancelAudioFade();
        weddingAudio.pause();
      }
    } else if (wasPlayingBeforeHide && !userMutedAudio) {
      wasPlayingBeforeHide = false;
      startWeddingAudioIfAllowed();
    }
  });

  // Attempt immediate background music on entry; gracefully arm first-gesture unlock if blocked
  startWeddingAudioIfAllowed();

  /* ========================================================================
     11. FULL ENGLISH / ARABIC BILINGUAL SWITCHER
     ======================================================================== */
  const I18N = {
    en: {
      entranceWhisper: "YOU ARE CORDIALLY INVITED",
      flapLabel: "WEDDING INVITATION",
      tapToOpen: "Tap the Gold Seal to Open",
      navCover: "Invitation Card",
      navWelcome: "Welcome",
      navStory: "Portrait",
      navCountdown: "Countdown",
      navDetails: "Details",
      navLocation: "Location",
      navRsvp: "RSVP",
      btnReplayShort: "Cover",
      cardKicker: "TOGETHER WITH THEIR FAMILIES",
      cardInviteLine: "INVITE YOU TO JOIN THEM IN CELEBRATING THEIR MARRIAGE",
      btnHeroRsvp: "Confirm Attendance",
      btnExploreDetails: "Explore Details",
      welcomeEyebrow: "WITH BLESSINGS & JOY",
      welcomeSub: "A Celebration of Love",
      welcomeNote: "The beginning of a cherished chapter — an evening of timeless elegance, heartfelt prayers, and warm celebration we would be deeply honored to share with you.",
      watchEnvelopeAgain: "Replay Cover Video",
      portraitEyebrow: "OUR FOREVER BEGINS",
      portraitHeadingLead: "Two Hearts,",
      portraitHeadingEm: "One Timeless Promise",
      portraitCopy: "Surrounded by the warmth of our families and dearest loved ones, we gather to celebrate a union written with grace, gratitude, and quiet beauty. Every detail of this evening has been lovingly prepared for your presence.",
      ringsCaption: "Together with our families — August 21, 2027",
      cdEyebrow: "COUNTING EVERY MOMENT",
      cdHeadingLead: "Until We Say",
      cdHeadingEm: "Forever",
      cdDays: "Days",
      cdHours: "Hours",
      cdMinutes: "Minutes",
      cdSeconds: "Seconds",
      cdArrivedShort: "Celebrating Forever Today",
      cdArrivedTitle: "Our Wedding Celebration Has Arrived!",
      cdArrivedSub: "Thank you for sharing the joy, blessings, and unforgettable beauty of our special day.",
      btnAddCalendar: "Save the Date (.ics Calendar)",
      detailsEyebrow: "THE CELEBRATION",
      detailsHeadingLead: "Wedding",
      detailsHeadingEm: "Details",
      detailsSub: "Everything you need to plan an effortless and memorable evening with us.",
      lblDate: "WEDDING DATE",
      dateNote: "An evening of joy under summer skies in Cairo.",
      lblTime: "CEREMONY & RECEPTION",
      timeNote: "Welcome reception begins promptly at seven in the evening.",
      lblVenue: "THE VENUE",
      venueNote: "Grand Crystal Ballroom & Garden Terrace.",
      lblAddress: "ADDRESS",
      sched1Title: "Guests Arrival & Welcome",
      sched2Title: "Grand Entrance & First Dance",
      sched3Title: "Candlelit Dinner & Celebration",
      locEyebrow: "VENUE DIRECTIONS",
      locNote: "Complimentary valet parking is available at the main palace entrance starting at 6:30 PM. Tap below for direct turn-by-turn navigation on Google Maps.",
      btnOpenMaps: "Open in Google Maps",
      btnCopyAddress: "Copy Address",
      rsvpEyebrow: "KINDLY REPLY",
      rsvpHeadingLead: "Confirm Your",
      rsvpHeadingEm: "Attendance",
      rsvpSub: "We would be delighted to celebrate with you. Please share your response below.",
      lblGuestName: "Guest Full Name",
      phGuestName: "Enter your full name",
      lblAttendance: "Will You Join Our Celebration?",
      optAcceptTitle: "Joyfully Accepts",
      optAcceptSub: "I will be honored to attend",
      optDeclineTitle: "Regretfully Declines",
      optDeclineSub: "Sending warm wishes from afar",
      lblGuests: "Number of Attending Guests (Including Yourself)",
      lblWish: "A Warm Wish for Mostafa & Basmala (Optional)",
      phWish: "Write a heartfelt blessing for the couple...",
      btnSubmitRsvp: "Record My RSVP Response",
      rsvpDoneTitle: "Thank You for Your Response",
      rsvpHonestNotice: "Note: This invitation is currently running without a live backend database, so your response has been saved locally in your browser preview. To deliver it directly to the couple, tap below to send your prepared reply via WhatsApp.",
      btnSendWhatsApp: "Send RSVP via WhatsApp",
      btnCopyRsvp: "Copy Response Text",
      btnEditRsvp: "Edit My Response",
      finaleVerse: "“Your presence is the most treasured gift we could ask for as we begin our life together.”"
    },
    ar: {
      entranceWhisper: "نتشرف بدعوتكم لحضور حفل الزفاف",
      flapLabel: "دعوة زفاف",
      tapToOpen: "اضغط على الختم الذهبي لفتح الدعوة",
      navCover: "بطاقة الدعوة",
      navWelcome: "الترحيب",
      navStory: "الصورة",
      navCountdown: "العدّاد",
      navDetails: "التفاصيل",
      navLocation: "الموقع",
      navRsvp: "تأكيد الحضور",
      btnReplayShort: "الغلاف",
      cardKicker: "برفقة عائلتيهما الكريمتين",
      cardInviteLine: "يتشرفان بدعوتكم لمشاركتهما فرحة الزفاف",
      btnHeroRsvp: "تأكيد الحضور",
      btnExploreDetails: "استكشف التفاصيل",
      welcomeEyebrow: "بكل الحب والامتنان",
      welcomeSub: "احتفال يجمع قلوبنا معكم",
      welcomeNote: "أمسية حالمة تجمع الأهل والأحبة لنبدأ معًا أجمل فصول حياتنا، ويزداد يومنا بهاءً وبهجة بحضوركم الغالي.",
      watchEnvelopeAgain: "إعادة عرض فيديو الغلاف",
      portraitEyebrow: "بداية العمر معًا",
      portraitHeadingLead: "قلبان جمعهما القدر،",
      portraitHeadingEm: "ووعد يمتد للأبد",
      portraitCopy: "وسط دفء العائلة وأقرب الأحباء، نحتفل ببداية حكاية كُتبت بالمودة والسكينة. صُمّمت كل تفصيلة في هذه الليلة بحب لتكون ذكرى لا تُنسى بحضوركم.",
      ringsCaption: "برفقة العائلتين — ٢١ أغسطس ٢٠٢٧",
      cdEyebrow: "نعدّ اللحظات شوقًا",
      cdHeadingLead: "حتى يجمعنا",
      cdHeadingEm: "يوم الفرح",
      cdDays: "أيام",
      cdHours: "ساعات",
      cdMinutes: "دقائق",
      cdSeconds: "ثوانٍ",
      cdArrivedShort: "نحتفل اليوم بأجمل بداية",
      cdArrivedTitle: "لقد حان يوم زفافنا السعيد!",
      cdArrivedSub: "شكرًا من القلب لمشاركتكم فرحتنا ودعواتكم الصادقة في أجمل أيام العمر.",
      btnAddCalendar: "إضافة الموعد للتقويم (.ics)",
      detailsEyebrow: "تفاصيل الأمسية",
      detailsHeadingLead: "موعد",
      detailsHeadingEm: "ومكان الاحتفال",
      detailsSub: "كل ما تحتاجون معرفته لتنسيق حضوركم والاستمتاع معنا بأجمل ليلة.",
      lblDate: "تاريخ الفرح",
      dateNote: "أمسية صيفية راقية تجمعنا بكم في القاهرة.",
      lblTime: "موعد الحفل",
      timeNote: "يبدأ استقبال الضيوف الكرام تمام السابعة مساءً.",
      lblVenue: "اسم القاعة",
      venueNote: "قاعة الكريستال الكبرى وتراس الحديقة.",
      lblAddress: "عنوان المكان",
      sched1Title: "استقبال الضيوف والترحيب",
      sched2Title: "الزفة الكبرى والرقصة الأولى",
      sched3Title: "العشاء الاحتفالي والأمسية",
      locEyebrow: "الاتجاهات والخريطة",
      locNote: "تتوفر خدمة صف السيارات المجانية عند البوابة الرئيسية للقاعة بدءًا من السادسة والنصف مساءً. اضغط بالأسفل لفتح الموقع مباشرة على خرائط Google.",
      btnOpenMaps: "فتح الموقع على خرائط Google",
      btnCopyAddress: "نسخ عنوان القاعة",
      rsvpEyebrow: "يسعدنا تأكيدكم",
      rsvpHeadingLead: "تأكيد",
      rsvpHeadingEm: "الحضور",
      rsvpSub: "وجودكم بيننا هو أجمل هدية. يرجى تسجيل ردكم الكريم أدناه.",
      lblGuestName: "اسم المدعو بالكامل",
      phGuestName: "اكتب اسمك الكامل هنا",
      lblAttendance: "هل ستشرفوننا بالحضور؟",
      optAcceptTitle: "تأكيد الحضور بكل سرور",
      optAcceptSub: "يسعدني مشاركتكم فرحة العمر",
      optDeclineTitle: "الاعتذار مع خالص التمنيات",
      optDeclineSub: "أرسل لكم أطيب الدعوات عن بُعد",
      lblGuests: "عدد الحاضرين (شاملًا حضرتك)",
      lblWish: "كلمة محبة لمصطفى وبسملة (اختياري)",
      phWish: "اكتب دعوة أو تهنئة جميلة للعروسين...",
      btnSubmitRsvp: "تسجيل تأكيد الحضور",
      rsvpDoneTitle: "شكرًا لمشاركتنا ردّك الكريم",
      rsvpHonestNotice: "ملاحظة بكل شفافية: هذه الدعوة تعمل حاليًا بدون خادم قاعدة بيانات (Backend) متصل، لذا تم حفظ ردك محليًا في المتصفح فقط. لإرسال التأكيد فعليًا إلى العروسين، اضغط على زر واتساب أدناه لإرسال رسالتك المجهّزة مباشرة.",
      btnSendWhatsApp: "إرسال التأكيد عبر واتساب",
      btnCopyRsvp: "نسخ نص التأكيد",
      btnEditRsvp: "تعديل الرد",
      finaleVerse: "«حضوركم الغالي هو أجمل هدية تزين بداية حياتنا معًا.»"
    }
  };

  const langButtons = [document.getElementById("btnInvLang"), document.getElementById("btnEntranceLang")];
  function setLanguage(lang) {
    currentLang = lang === "ar" ? "ar" : "en";
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    langButtons.forEach(function (btn) {
      if (btn) btn.textContent = currentLang === "ar" ? "EN" : "عربي";
    });

    const dict = I18N[currentLang];
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const k = el.dataset.i18n;
      if (dict[k]) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      const k = el.dataset.i18nPlaceholder;
      if (dict[k]) el.placeholder = dict[k];
    });

    applyWeddingConfig();
    updateCountdown();
    updateAudioButtonUI();
    if (lastSavedRsvp && rsvpConfirmation && !rsvpConfirmation.hidden) {
      renderRsvpConfirmation(lastSavedRsvp);
    }
  }

  langButtons.forEach(function (btn) {
    if (btn) {
      btn.addEventListener("click", function () {
        setLanguage(currentLang === "en" ? "ar" : "en");
      });
    }
  });

  applyWeddingConfig();
  syncGuestStepperState();
  updateAudioButtonUI();
})();
