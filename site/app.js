// Scroll-Reveal + Footer-Jahr — bewusst minimal, kein Framework.
(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal");

  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => observer.observe(el));
})();

// Phone-Stack: Klick schiebt die vorderste Karte nach hinten (Shuffle).
(() => {
  const stack = document.querySelector(".phone-stack");
  if (!stack) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let order = Array.from(stack.querySelectorAll(".phone-card"));
  let busy = false;

  function apply() {
    order.forEach((card, i) => {
      card.classList.remove("pos-0", "pos-1", "pos-2", "pos-3");
      card.classList.add(`pos-${i}`);
    });
  }
  apply();

  function next() {
    if (busy || order.length < 2) return;
    const front = order[0];
    order = [...order.slice(1), front];

    if (reduced) {
      apply();
      return;
    }

    // Erst seitlich rausgleiten, dann hinten einsortieren — die
    // pos-Transitions ziehen die restlichen Karten nach vorn.
    busy = true;
    front.classList.add("is-leaving");
    setTimeout(() => {
      front.classList.remove("is-leaving");
      apply();
      setTimeout(() => {
        busy = false;
      }, 480);
    }, 270);
  }

  stack.addEventListener("click", next);
  stack.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      next();
    }
  });
})();

// Lightbox: Klick auf Screenshots öffnet sie groß.
(() => {
  const targets = document.querySelectorAll(
    ".hero-shot img, .showcase-shot img, .wide-shot img"
  );
  if (targets.length === 0) return;

  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Bildansicht");
  overlay.innerHTML =
    '<button class="lightbox-close" type="button" aria-label="Schließen">×</button><img alt="" />';
  document.body.appendChild(overlay);

  const overlayImg = overlay.querySelector("img");
  const closeBtn = overlay.querySelector(".lightbox-close");
  let prevOverflow = "";

  function open(src, alt) {
    overlayImg.src = src;
    overlayImg.alt = alt || "";
    overlay.classList.add("is-open");
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function close() {
    overlay.classList.remove("is-open");
    overlayImg.removeAttribute("src");
    document.body.style.overflow = prevOverflow;
  }

  targets.forEach((img) => {
    img.addEventListener("click", () => open(img.currentSrc || img.src, img.alt));
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target === closeBtn) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
})();
