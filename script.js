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

// Enhanced hover effect for project actions
document.addEventListener("DOMContentLoaded", function () {
  const projectActions = document.querySelectorAll(".project-actions img");

  projectActions.forEach((action) => {
    action.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.2) rotate(5deg)";
    });

    action.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1) rotate(0deg)";
    });
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

    // Special case for Home when at top
    if (pageYOffset < sections[0].offsetTop - 100) {
      navLinks.forEach((link) => link.classList.remove("active"));
      document.querySelector('.nav-links a[href="#"]').classList.add("active");
    }
  }

  window.addEventListener("scroll", setActiveLink);
  setActiveLink(); // Call once on load
});
