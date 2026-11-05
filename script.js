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

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= sectionTop - sectionHeight / 3) {
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

// Hero dot grid lights up around the mouse
document.addEventListener("DOMContentLoaded", function () {
  const hero = document.querySelector(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hero || reduceMotion) return;

  let frame = 0;
  hero.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse") return;
    const rect = hero.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      hero.style.setProperty("--mx", x + "px");
      hero.style.setProperty("--my", y + "px");
      hero.classList.add("is-pointing");
    });
  });

  hero.addEventListener("pointerleave", function () {
    hero.classList.remove("is-pointing");
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
