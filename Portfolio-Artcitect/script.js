/* =========================================================
   STUDIO TINT — script.js
   Minimal, dependency-free interaction layer.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     ENVIRONMENT & HELPERS
     --------------------------------------------------------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var supportsIO = "IntersectionObserver" in window;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  
  // Throttle function for scroll events (performance)
  function rafThrottle(fn) {
    var scheduled = false;
    return function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () { 
        scheduled = false; 
        fn(); 
      });
    };
  }

  /* ---------------------------------------------------------
     1. PRELOADER
     --------------------------------------------------------- */
  var preloader = $("#preloader");
  var heroRevealDone = false;

  function startHeroReveal() {
    if (heroRevealDone) return;
    heroRevealDone = true;
    $$(".hero [data-reveal], .hero [data-split]").forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add("is-visible");
        el.classList.add("is-split-visible");
      }, i * 130);
    });
  }

  if (preloader) {
    if (reduceMotion) {
      preloader.classList.add("is-done");
      startHeroReveal();
    } else {
      requestAnimationFrame(function () { preloader.classList.add("is-ready"); });
      
      var hidePreloader = function () {
        if (preloader.classList.contains("is-done")) return;
        preloader.classList.add("is-done");
        startHeroReveal();
      };

      if (document.readyState === "complete") {
        setTimeout(hidePreloader, 700);
      } else {
        window.addEventListener("load", function () { setTimeout(hidePreloader, 900); }, { once: true });
      }
      // Fallback in case 'load' takes too long
      setTimeout(hidePreloader, 3200);
    }
  } else {
    if (reduceMotion) startHeroReveal();
    else requestAnimationFrame(startHeroReveal);
  }

  /* ---------------------------------------------------------
     2. SCROLL PROGRESS BAR
     --------------------------------------------------------- */
  var progressBar = $("#progressBar");
  var updateProgress = rafThrottle(function () {
    if (!progressBar) return;
    var doc = document.documentElement;
    var scrollTop = window.pageYOffset || doc.scrollTop || document.body.scrollTop || 0;
    var height = doc.scrollHeight - window.innerHeight;
    var pct = height > 0 ? (scrollTop / height) * 100 : 0;
    progressBar.style.width = clamp(pct, 0, 100) + "%";
  });

  if (progressBar) {
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
  }

  /* ---------------------------------------------------------
     3. HEADER & NAVBAR STATE
     --------------------------------------------------------- */
  var header = $("#siteHeader");
  
  var updateHeader = rafThrottle(function () {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 40);
  });

  if (header) {
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  // Detect if navbar is hovering over a dark section
  var darkSections = $$(".philosophy-section, .contact-section, .site-footer");
  var updateDarkState = rafThrottle(function () {
    if (!header || !darkSections.length || header.classList.contains("menu-open")) return;
    
    var headerBottom = header.offsetHeight;
    var onDark = false;
    
    darkSections.forEach(function (sec) {
      var rect = sec.getBoundingClientRect();
      if (rect.top <= headerBottom && rect.bottom >= 0) {
        onDark = true;
      }
    });
    
    header.classList.toggle("on-dark", onDark);
  });

  if (header) {
    window.addEventListener("scroll", updateDarkState, { passive: true });
    window.addEventListener("resize", updateDarkState, { passive: true });
    updateDarkState();
  }

  /* ---------------------------------------------------------
     4. MOBILE NAVIGATION (Hamburger Menu)
     --------------------------------------------------------- */
  var navToggle = $("#navToggle");
  var navMenu = $("#navMenu");
  var navLinks = navMenu ? $$(".nav-link", navMenu) : [];
  var scrollLockY = 0;

  function lockScroll() {
    scrollLockY = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.body.style.top = "-" + scrollLockY + "px";
    document.body.classList.add("menu-locked");
    document.documentElement.style.overflow = "hidden";
  }

  function unlockScroll() {
    document.body.classList.remove("menu-locked");
    document.body.style.top = "";
    document.documentElement.style.overflow = "";
    window.scrollTo(0, scrollLockY);
  }

  function isMenuOpen() {
    return navMenu && navMenu.classList.contains("open");
  }

  function openMenu() {
    if (!navToggle || !navMenu) return;
    navMenu.classList.add("open");
    navToggle.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    if (header) header.classList.add("menu-open");
    lockScroll();
  }

  function closeMenu(returnFocus) {
    if (!navToggle || !navMenu) return;
    navMenu.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    if (header) header.classList.remove("menu-open");
    unlockScroll();
    
    if (returnFocus && typeof navToggle.focus === "function") {
      navToggle.focus();
    }
  }

  if (navToggle && navMenu) {
    // Toggle button click
    navToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen()) closeMenu(false);
      else openMenu();
    });

    // Close menu when a link is clicked
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () { closeMenu(false); });
    });

    // Close menu when clicking the dark overlay background
    navMenu.addEventListener("click", function (e) {
      if (e.target === navMenu) closeMenu(false);
    });

    // Close menu on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isMenuOpen()) closeMenu(true);
    });

    // Auto-close if window is resized to desktop
    window.addEventListener("resize", rafThrottle(function() {
      if (window.innerWidth > 991.98 && isMenuOpen()) closeMenu(false);
    }), { passive: true });
  }

  /* ---------------------------------------------------------
     5. SPLIT-TEXT ANIMATION (Hero Headings)
     --------------------------------------------------------- */
  function prepareSplit(el) {
    if (!el || el.dataset.splitPrepared === "true") return;
    el.dataset.splitPrepared = "true";

    var html = el.innerHTML;
    var lines = html.split(/<br\s*\/?>/i);
    var frag = document.createDocumentFragment();

    lines.forEach(function (line, li) {
      var lineEl = document.createElement("span");
      lineEl.className = "split-line";
      
      var words = line.trim().split(/\s+/).filter(Boolean);
      words.forEach(function (word, wi) {
        var wordEl = document.createElement("span");
        wordEl.className = "split-word";
        wordEl.style.transitionDelay = (li * 4 + wi) * 55 + "ms";
        wordEl.textContent = word;
        lineEl.appendChild(wordEl);
        lineEl.appendChild(document.createTextNode(" "));
      });

      frag.appendChild(lineEl);
      if (li < lines.length - 1) frag.appendChild(document.createElement("br"));
    });

    el.innerHTML = "";
    el.appendChild(frag);
  }

  if (!reduceMotion) {
    $$("[data-split]").forEach(prepareSplit);
  }

  /* ---------------------------------------------------------
     6. SCROLL REVEAL ANIMATIONS
     --------------------------------------------------------- */
  var revealEls = $$(".reveal").filter(function (el) { return !el.closest(".hero"); });
  var splitScrollEls = $$("[data-split]").filter(function (el) { return !el.closest(".hero"); });

  if (reduceMotion || !supportsIO) {
    // If reduced motion is on or browser doesn't support IO, show everything instantly
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    splitScrollEls.forEach(function (el) { el.classList.add("is-split-visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        setTimeout(function () {
          entry.target.classList.add("is-visible");
          entry.target.classList.add("is-split-visible");
        }, (i % 4) * 70);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealEls.forEach(function (el) { observer.observe(el); });
    splitScrollEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------
     7. HERO PARALLAX EFFECT
     --------------------------------------------------------- */
  var heroImg = $(".hero-media img");
  var heroEl = $(".hero");

  if (heroImg && heroEl && !reduceMotion && canHover) {
    var heroHeight = heroEl.offsetHeight;
    var updateParallax = rafThrottle(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y < heroHeight) {
        heroImg.style.transform = "translate3d(0," + (y * 0.18) + "px, 0) scale(1.06)";
      } else {
        heroImg.style.transform = "";
      }
    });

    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });
  }

  /* ---------------------------------------------------------
     8. SERVICES IMAGE PREVIEW (Follows Cursor)
     --------------------------------------------------------- */
  var preview = $("#servicePreview");
  var previewImg = $("#servicePreviewImg");
  var serviceRows = $$(".service-row");

  if (preview && previewImg && serviceRows.length && canHover) {
    var previewW = 220;
    var previewH = 160;
    var pad = 24;

    serviceRows.forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        var src = row.getAttribute("data-preview");
        if (!src) return;
        previewImg.src = src;
        preview.classList.add("active");
      });

      row.addEventListener("mousemove", function (e) {
        var left = e.clientX + pad;
        var top = e.clientY - previewH / 2;

        // Keep preview inside viewport bounds
        if (left + previewW > window.innerWidth - 8) {
          left = e.clientX - previewW - pad;
        }
        top = clamp(top, 8, window.innerHeight - previewH - 8);

        preview.style.transform = "translate3d(" + left + "px," + top + "px,0) scale(1)";
      });

      row.addEventListener("mouseleave", function () {
        preview.classList.remove("active");
      });
    });

    preview.style.transform = "translate3d(0,0,0) scale(.96)";
  }

  /* ---------------------------------------------------------
     9. SMOOTH SCROLLING (Offsets Fixed Header)
     --------------------------------------------------------- */
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (!href || href === "#" || href.length < 2) return;

      var target;
      try { target = document.querySelector(href); } catch (err) { return; }
      if (!target) return;

      e.preventDefault();

      var headerOffset = header ? header.offsetHeight : 0;
      var targetTop = target.getBoundingClientRect().top + 
                      (window.pageYOffset || document.documentElement.scrollTop) - 
                      headerOffset - 8;

      if (reduceMotion) {
        window.scrollTo(0, targetTop);
      } else {
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      }

      if (history.replaceState) {
        history.replaceState(null, "", href);
      }
    });
  });

})();