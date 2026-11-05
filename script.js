// Scroll Reveal Animation for Projects
document.addEventListener("DOMContentLoaded", function () {
  const projectItems = document.querySelectorAll(".project-item, .education-card");

  // Intersection Observer options
  const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -100px 0px",
  };

  // Callback function for intersection observer
  const observerCallback = (entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Add visible class with a slight delay for stagger effect
        setTimeout(() => {
          entry.target.classList.add("visible");
        }, index * 150);

        // Optional: Stop observing after animation
        observer.unobserve(entry.target);
      }
    });
  };

  // Create observer
  const observer = new IntersectionObserver(observerCallback, observerOptions);

  // Observe each project item
  projectItems.forEach((item) => {
    observer.observe(item);
  });
});

// Active navbar link on scroll
document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a");

  function setActiveLink() {
    let current = "";
    // A section is current once its top passes a line 35% down the viewport
    // (measuring against section height made tall sections activate too early)
    const probe = pageYOffset + window.innerHeight * 0.35;

    sections.forEach((section) => {
      if (section.offsetTop <= probe) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + current) {
        link.classList.add("active");
      }
    });

    // Nothing is active while still in the hero
    if (pageYOffset < sections[0].offsetTop - 100) {
      navLinks.forEach((link) => link.classList.remove("active"));
    }
  }

  window.addEventListener("scroll", setActiveLink);
  setActiveLink(); // Call once on load
});

// Navbar background once the page scrolls
document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector(".navbar");

  function updateNavbar() {
    navbar.classList.toggle("scrolled", window.scrollY > 10);
  }

  window.addEventListener("scroll", updateNavbar, { passive: true });
  updateNavbar();
});

// Footer copyright year
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("current-year").textContent =
    new Date().getFullYear();
});

// Hero log: measures this visit for real — load time, the visitor's first
// interaction, and how fast the page answered it
document.addEventListener("DOMContentLoaded", function () {
  const log = document.getElementById("interaction-log");
  const ring = document.querySelector(".cover-text");
  if (!log) return;

  // parts: plain strings, or [text, className] pairs
  function addLine(mark, parts, className) {
    const line = document.createElement("li");
    if (className) line.className = className;
    const markEl = document.createElement("span");
    markEl.className = "log-mark";
    markEl.textContent = mark;
    line.appendChild(markEl);
    parts.forEach((part) => {
      if (typeof part === "string") {
        line.appendChild(document.createTextNode(part));
      } else {
        const span = document.createElement("span");
        span.className = part[1];
        span.textContent = part[0];
        line.appendChild(span);
      }
    });
    log.appendChild(line);
    return line;
  }

  function showInteraction({ type, at, response }) {
    addLine(
      "→",
      ["first interaction: ", [type, "log-value"], " at ", [(at / 1000).toFixed(1) + " s", "log-value"]],
      "log-event",
    );
    // 200 ms is the "good" threshold for Interaction to Next Paint
    addLine(
      response < 200 ? "✓" : "!",
      ["next frame in ", [response + " ms", response < 200 ? "log-value log-good" : "log-value"], [" (good: under 200 ms)", "log-note"]],
      response < 200 ? "log-ok" : "",
    );
    if (ring) ring.classList.add("is-judged");
  }

  let loaded = false;
  let pending = null;
  let waiting = null;

  log.textContent = "";
  addLine("$", ["open " + (location.host || "portfolio")]);

  window.addEventListener("load", function () {
    loaded = true;
    // performance.now() is measured from the start of navigation
    addLine("✓", ["page ready in ", [Math.round(performance.now()) + " ms", "log-value"]], "log-ok");
    if (pending) showInteraction(pending);
    else waiting = addLine("…", ["waiting for your first interaction"], "log-wait");
  });

  const eventNames = { keydown: "key press", wheel: "scroll", touchstart: "tap" };
  const listened = ["pointerdown", "keydown", "wheel", "touchstart"];

  function onFirstInteraction(event) {
    listened.forEach((name) => window.removeEventListener(name, onFirstInteraction));
    const type =
      event.type === "pointerdown"
        ? event.pointerType === "touch" ? "tap" : "click"
        : eventNames[event.type];
    const at = event.timeStamp; // same clock as performance.now()

    // Time until the frame after this input has been produced
    requestAnimationFrame(function () {
      setTimeout(function () {
        const result = { type, at, response: Math.max(1, Math.round(performance.now() - at)) };
        // Fired after measuring, so the hero's reaction doesn't slow the number down
        window.dispatchEvent(new CustomEvent("firstinteraction", { detail: result }));
        if (!loaded) {
          pending = result;
          return;
        }
        if (waiting) waiting.remove();
        showInteraction(result);
      });
    });
  }

  listened.forEach((name) =>
    window.addEventListener(name, onFirstInteraction, { passive: true }),
  );
});

// Hero field: a dot grid that leans away from the cursor and carries a ripple
// out from every click/tap (and from "interaction" on the first interaction).
// The avatar tilts toward the cursor. Animates only while something moves.
document.addEventListener("DOMContentLoaded", function () {
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".hero-field");
  if (!hero || !canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const avatar = hero.querySelector(".avatar-wrapper");
  const word = hero.querySelector(".cover-text");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GAP = 28; // grid spacing, px
  const REACH = 170; // cursor influence radius, px
  const WAVE_SPEED = 650; // ripple speed, px/s
  const WAVE_LIFE = 1.5; // ripple lifetime, s

  let dots = [];
  let width = 0;
  let height = 0;
  let pointer = null; // mouse position while over the hero
  const ripples = [];
  const tilt = { x: 0, y: 0 };
  let running = false;
  let visible = true;

  hero.classList.add("has-field");

  function build() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    const offsetX = (width % GAP) / 2 + GAP / 2;
    const offsetY = (height % GAP) / 2 + GAP / 2;
    for (let y = offsetY; y < height; y += GAP) {
      for (let x = offsetX; x < width; x += GAP) {
        dots.push({ x, y, dx: 0, dy: 0, glow: 0 });
      }
    }
    draw(performance.now());
  }

  // Draws one frame; returns true while anything is still moving
  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    for (let i = ripples.length - 1; i >= 0; i--) {
      if ((now - ripples[i].start) / 1000 > WAVE_LIFE) ripples.splice(i, 1);
    }

    let moving = ripples.length > 0;

    // rAF's timestamp can be slightly older than a ripple created this frame
    for (const r of ripples) r.t = Math.max(0, (now - r.start) / 1000);

    // Faint wavefront line for each ripple
    ctx.lineWidth = 1;
    for (const r of ripples) {
      const t = r.t;
      ctx.strokeStyle = `rgba(196, 161, 255, ${(0.35 * (1 - t / WAVE_LIFE)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, t * WAVE_SPEED, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";

    for (const d of dots) {
      let tx = 0;
      let ty = 0;
      let glow = 0;

      if (pointer) {
        const vx = d.x - pointer.x;
        const vy = d.y - pointer.y;
        const dist = Math.hypot(vx, vy) || 1;
        if (dist < REACH) {
          const f = 1 - dist / REACH;
          tx += (vx / dist) * f * f * 18;
          ty += (vy / dist) * f * f * 18;
          glow = f;
        }
      }

      for (const r of ripples) {
        const t = r.t;
        const vx = d.x - r.x;
        const vy = d.y - r.y;
        const dist = Math.hypot(vx, vy) || 1;
        const front = 1 - Math.abs(dist - t * WAVE_SPEED) / 70; // wave band ~70px
        if (front > 0) {
          const k = front * (1 - t / WAVE_LIFE);
          tx += (vx / dist) * k * 20;
          ty += (vy / dist) * k * 20;
          glow = Math.max(glow, k);
        }
      }

      // Ease toward the target so dots spring back smoothly
      d.dx += (tx - d.dx) * 0.16;
      d.dy += (ty - d.dy) * 0.16;
      d.glow += (glow - d.glow) * 0.18;
      if (Math.abs(tx - d.dx) > 0.05 || Math.abs(ty - d.dy) > 0.05 || Math.abs(glow - d.glow) > 0.01) {
        moving = true;
      }

      if (d.glow < 0.03) {
        ctx.fillRect(d.x + d.dx - 0.8, d.y + d.dy - 0.8, 1.6, 1.6);
      } else {
        ctx.fillStyle = `rgba(196, 161, 255, ${(0.15 + d.glow * 0.8).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x + d.dx, d.y + d.dy, 0.9 + d.glow * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      }
    }

    // Avatar tilt eases toward the pointer, back to flat when it leaves
    if (avatar) {
      let targetX = 0;
      let targetY = 0;
      if (pointer) {
        const box = avatar.getBoundingClientRect();
        const heroBox = hero.getBoundingClientRect();
        const cx = box.left - heroBox.left + box.width / 2;
        const cy = box.top - heroBox.top + box.height / 2;
        targetY = Math.max(-1, Math.min(1, (pointer.x - cx) / 600)) * 12;
        targetX = Math.max(-1, Math.min(1, (pointer.y - cy) / 400)) * -9;
      }
      tilt.x += (targetX - tilt.x) * 0.12;
      tilt.y += (targetY - tilt.y) * 0.12;
      if (Math.abs(targetX - tilt.x) > 0.05 || Math.abs(targetY - tilt.y) > 0.05) moving = true;
      avatar.style.setProperty("--tilt-x", tilt.x.toFixed(2) + "deg");
      avatar.style.setProperty("--tilt-y", tilt.y.toFixed(2) + "deg");
    }

    return moving;
  }

  function frame(now) {
    if (draw(now) && visible) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (running || !visible || reduceMotion) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function ripple(x, y) {
    ripples.push({ x, y, start: performance.now() });
    kick();
  }

  function localPoint(event) {
    const rect = hero.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  build();
  new ResizeObserver(build).observe(hero);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) kick();
  }).observe(hero);

  if (reduceMotion) return; // static dots only

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    pointer = localPoint(event);
    kick();
  });

  hero.addEventListener("pointerleave", () => {
    pointer = null;
    kick();
  });

  hero.addEventListener("pointerdown", (event) => {
    const point = localPoint(event);
    ripple(point.x, point.y);
  });

  // First interaction without a point (scroll, key press): ripple from the word
  window.addEventListener("firstinteraction", (event) => {
    if (!word || event.detail.type === "click" || event.detail.type === "tap") return;
    const box = word.getBoundingClientRect();
    const heroBox = hero.getBoundingClientRect();
    ripple(box.left - heroBox.left + box.width / 2, box.top - heroBox.top + box.height / 2);
  });
});

// "interaction": letters ripple and the ring redraws when the word is hovered
document.addEventListener("DOMContentLoaded", function () {
  const word = document.querySelector(".cover-text");
  const label = word && word.querySelector(".cover-word");
  const ring = word && word.querySelector(".circle-decoration path");
  if (!word || !label) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Split into letters for the animation; screen readers get the whole word
  const text = label.textContent.trim();
  label.textContent = "";
  const spoken = document.createElement("span");
  spoken.className = "sr-only";
  spoken.textContent = text;
  const letters = document.createElement("span");
  letters.className = "cover-letters";
  letters.setAttribute("aria-hidden", "true");
  [...text].forEach((char, i) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.setProperty("--i", i);
    letters.appendChild(span);
  });
  label.append(spoken, letters);

  if (reduceMotion) return;

  function wave() {
    if (word.classList.contains("is-waving")) return;
    word.classList.add("is-waving");
    if (ring) {
      ring.style.animation = "none";
      void ring.getBoundingClientRect(); // restart the draw animation
      ring.style.animation = "drawRing 0.9s cubic-bezier(0.65, 0, 0.35, 1) forwards";
    }
  }

  letters.lastElementChild.addEventListener("animationend", () => {
    word.classList.remove("is-waving");
  });

  word.addEventListener("pointerenter", wave);
  window.addEventListener("firstinteraction", wave);
});

// Skills orbit: skills circle the core on three tilted orbits (back = small and
// behind the core, front = large and in front). Picking a skill pauses the
// orbit and shows where it was used, from the button's data attributes.
document.addEventListener("DOMContentLoaded", function () {
  const orbit = document.getElementById("tech-orbit");
  const detail = document.getElementById("skill-detail");
  if (!orbit || !detail) return;

  // size: fraction of the outer orbit; speed: radians per second
  const RINGS = {
    tools: { label: "Tools", size: 0.42, speed: 0.16 },
    backend: { label: "Backend & data", size: 0.7, speed: -0.11 },
    frontend: { label: "Frontend", size: 1, speed: 0.07 },
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const link = orbit.querySelector(".orbit-link");
  const legendItems = document.querySelectorAll(".legend-item");
  const ringEls = {};
  orbit.querySelectorAll(".orbit-ring").forEach((el) => (ringEls[el.dataset.ring] = el));

  const nodes = [...orbit.querySelectorAll(".tech-node")].map((button) => ({
    button,
    item: button.parentElement,
    ring: button.dataset.ring,
    name: button.querySelector(".tech-name").textContent,
    angle: 0,
    x: 0,
    y: 0,
  }));

  // Spread each ring evenly, offset per ring so the rings don't line up
  Object.keys(RINGS).forEach((ring, r) => {
    const members = nodes.filter((n) => n.ring === ring);
    members.forEach((n, i) => {
      n.angle = (i / members.length) * Math.PI * 2 + 0.35 + r * 0.7;
    });
  });

  let geo = null;
  let active = null; // skill shown right now
  let pinned = null; // skill picked with a click/tap/Enter
  let focusRing = null; // ring highlighted from the legend
  let intro = reduceMotion ? 1 : 0; // 0 → 1: skills fly out from the core once

  function layout() {
    const width = orbit.clientWidth;
    if (width < 120) return; // hidden or mid-resize: keep the last layout
    const small = width < 600;
    const node = small ? 44 : 60;
    const rx = width / 2 - node / 2 - 4;
    const ry = rx * (small ? 0.62 : 0.38);
    const cy = ry + node / 2 + 8;
    const height = Math.round(cy + ry + node / 2 + 44); // room for the label under the front node
    orbit.style.height = height + "px";
    orbit.style.setProperty("--node", node + "px");
    orbit.style.setProperty("--cy", cy + "px");
    geo = { cx: width / 2, cy, rx, ry, node };

    Object.entries(RINGS).forEach(([ring, cfg]) => {
      const el = ringEls[ring];
      el.setAttribute("cx", geo.cx);
      el.setAttribute("cy", geo.cy);
      el.setAttribute("rx", rx * cfg.size);
      el.setAttribute("ry", ry * cfg.size);
    });
    place();
  }

  function place() {
    if (!geo) return;
    const spread = 1 - Math.pow(1 - intro, 3); // ease-out
    nodes.forEach((n) => {
      const cfg = RINGS[n.ring];
      n.x = geo.cx + Math.cos(n.angle) * geo.rx * cfg.size * spread;
      n.y = geo.cy + Math.sin(n.angle) * geo.ry * cfg.size * spread;
      const depth = (Math.sin(n.angle) + 1) / 2; // 0 = back, 1 = front
      const isActive = n === active;
      const scale = isActive ? 1.12 : 0.78 + 0.22 * depth;
      let opacity = 0.68 + 0.32 * depth; // dark logos must stay readable at the back
      if (isActive) opacity = 1;
      else if (focusRing && n.ring !== focusRing) opacity = 0.22;
      else if (active) opacity *= 0.5;

      n.item.style.transform = `translate3d(${n.x - geo.node / 2}px, ${n.y - geo.node / 2}px, 0) scale(${scale})`;
      n.item.style.opacity = (opacity * spread).toFixed(3);
      n.item.style.zIndex = isActive ? 5 : depth > 0.5 ? 3 : 1; // core sits at 2
    });

    if (active) {
      link.setAttribute("x1", geo.cx);
      link.setAttribute("y1", geo.cy);
      link.setAttribute("x2", active.x);
      link.setAttribute("y2", active.y);
    }
  }

  function chip(text, href) {
    const a = document.createElement("a");
    a.className = "skill-chip";
    a.href = href;
    a.textContent = text;
    // Centre the target card; a plain anchor jump leaves it under the navbar
    // while its reveal animation is still offsetting it
    a.addEventListener("click", (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      if (target.classList.contains("project-item")) {
        target.classList.add("is-spotlit");
        setTimeout(() => target.classList.remove("is-spotlit"), 1800);
      }
    });
    return a;
  }

  function row(label, chips) {
    const div = document.createElement("div");
    div.className = "skill-row";
    const span = document.createElement("span");
    span.className = "skill-label";
    span.textContent = label;
    const list = document.createElement("div");
    list.className = "skill-chips";
    list.append(...chips);
    div.append(span, list);
    return div;
  }

  function renderDetail(n) {
    detail.textContent = "";
    const head = document.createElement("div");
    head.className = "skill-head";
    const name = document.createElement("span");
    name.className = "skill-name";
    name.textContent = n.name;
    const cat = document.createElement("span");
    cat.className = "skill-cat";
    cat.textContent = RINGS[n.ring].label;
    head.append(name, cat);
    detail.append(head);

    const projects = (n.button.dataset.projects || "").split(" ").filter(Boolean);
    if (projects.length) {
      detail.append(
        row(
          "Projects",
          projects.map((id) => {
            const title = document.querySelector(`#project-${id} .project-title`);
            return chip(title ? title.textContent : id, `#project-${id}`);
          }),
        ),
      );
    }

    const experience = (n.button.dataset.experience || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (experience.length) {
      detail.append(row("Experience", experience.map((place) => chip(place, "#work"))));
    }
  }

  function show(n) {
    active = n;
    nodes.forEach((m) => m.button.classList.toggle("is-active", m === n));
    orbit.classList.toggle("has-active", Boolean(n));
    link.classList.toggle("is-on", Boolean(n));
    const litRing = n ? n.ring : focusRing;
    Object.entries(ringEls).forEach(([ring, el]) => {
      el.classList.toggle("is-lit", ring === litRing);
      el.classList.toggle("is-dim", Boolean(litRing) && ring !== litRing);
    });
    // The panel keeps the last skill looked at, so its links stay reachable
    // after the pointer leaves the orbit
    if (n) renderDetail(n);
    place();
  }

  nodes.forEach((n) => {
    n.button.setAttribute("aria-pressed", "false");
    n.button.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") show(n);
    });
    n.button.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") show(pinned);
    });
    n.button.addEventListener("focus", () => show(n));
    n.button.addEventListener("blur", () => show(pinned));
    n.button.addEventListener("click", () => {
      pinned = pinned === n ? null : n;
      nodes.forEach((m) => m.button.setAttribute("aria-pressed", String(m === pinned)));
      show(pinned || n);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pinned) {
      pinned.button.setAttribute("aria-pressed", "false");
      pinned = null;
      show(null);
    }
  });

  legendItems.forEach((item) => {
    const on = () => {
      focusRing = item.dataset.ring;
      legendItems.forEach((other) => other.classList.toggle("is-on", other === item));
      show(active);
    };
    const off = () => {
      focusRing = null;
      item.classList.remove("is-on");
      show(active);
    };
    item.addEventListener("pointerenter", on);
    item.addEventListener("pointerleave", off);
    item.addEventListener("focus", on);
    item.addEventListener("blur", off);
  });

  // Slow down while the pointer is over the orbit so skills are easy to catch
  let slow = false;
  orbit.addEventListener("pointerenter", () => (slow = true));
  orbit.addEventListener("pointerleave", () => (slow = false));

  // Animate only while the orbit is on screen
  let running = false;
  let visible = false;
  let last = 0;

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (intro < 1) intro = Math.min(1, intro + dt / 1.3);
    const pace = active ? 0 : slow ? 0.25 : 1;
    nodes.forEach((n) => (n.angle += RINGS[n.ring].speed * pace * dt));
    place();
    requestAnimationFrame(tick);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  orbit.classList.add("is-live");
  layout();
  new ResizeObserver(layout).observe(orbit);

  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else running = false;
    },
    { threshold: 0.3 },
  ).observe(orbit);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else start();
  });
});

// Project frames: each one "loads" its site when it scrolls into view (URL
// types in, the bar runs until the screenshot has really loaded, then the
// screenshot is revealed), and tilts toward the cursor with a glare.
document.addEventListener("DOMContentLoaded", function () {
  const section = document.querySelector(".projects-section");
  if (!section) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cards = section.querySelectorAll(".project-item");

  if (!reduceMotion) {
    section.classList.add("js-load");

    const frames = section.querySelectorAll(".browser-frame");
    frames.forEach((frame) => {
      const url = frame.querySelector(".browser-url");
      url.dataset.full = url.textContent;
      url.textContent = "";
    });

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function load(frame) {
      const url = frame.querySelector(".browser-url");
      const img = frame.querySelector("img");
      const full = url.dataset.full;
      const step = Math.max(18, 380 / full.length);
      for (let i = 1; i <= full.length; i++) {
        url.textContent = full.slice(0, i);
        await wait(step);
      }
      frame.classList.add("is-loading");
      // Reveal once the bar has run and the image is actually decoded
      const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
      await Promise.all([wait(650), ready]);
      frame.classList.add("is-loaded");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          load(entry.target);
        });
      },
      { threshold: 0.35 },
    );
    frames.forEach((frame) => observer.observe(frame));
  }

  if (reduceMotion) return;

  cards.forEach((card) => {
    const frame = card.querySelector(".browser-frame");
    if (!frame) return;
    let raf = 0;

    card.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = frame.getBoundingClientRect();
        // -1..1 from the frame centre; clamped so text-side hovers still lean it
        const px = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width - 0.5) * 2));
        const py = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height - 0.5) * 2));
        frame.classList.add("is-tilting");
        frame.style.setProperty("--ry", (px * 7).toFixed(2) + "deg");
        frame.style.setProperty("--rx", (py * -5).toFixed(2) + "deg");
        frame.style.setProperty("--gx", ((px + 1) * 50).toFixed(1) + "%");
        frame.style.setProperty("--gy", ((py + 1) * 50).toFixed(1) + "%");
      });
    });

    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      frame.classList.remove("is-tilting");
      frame.style.setProperty("--rx", "0deg");
      frame.style.setProperty("--ry", "0deg");
    });
  });
});

// Copy email button in the contact section
document.addEventListener("DOMContentLoaded", function () {
  const button = document.querySelector(".copy-email");
  if (!button) return;
  const label = button.querySelector(".copy-label");
  const status = document.getElementById("copy-status");
  let timer;

  button.addEventListener("click", async function () {
    const email = button.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
    } catch (error) {
      // Clipboard unavailable (e.g. not https): open the mail app instead
      window.location.href = "mailto:" + email;
      return;
    }
    label.textContent = "Copied";
    status.textContent = "Email address copied";
    button.classList.add("is-copied");

    clearTimeout(timer);
    timer = setTimeout(function () {
      label.textContent = "Copy email";
      status.textContent = "";
      button.classList.remove("is-copied");
    }, 2000);
  });
});
