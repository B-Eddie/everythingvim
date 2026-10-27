// Axiom references: https://styles.refero.design/style/c809190a-035c-458d-87ed-4758807dd84e
// and https://axiom.co/ — adapt its terminal/log UI into short, discrete reveals.
// Content starts visible. Motion never owns focus, demo state, or key handling.
(() => {
  "use strict";
  const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const animations = new Set();
  let observer;

  function animate(element, frames, options) {
    if (!element || preference?.matches || typeof element.animate !== "function") return;
    const animation = element.animate(frames, { duration: 220, easing: "ease-out", ...options });
    animations.add(animation);
    animation.finished?.then(() => animations.delete(animation)).catch(() => animations.delete(animation));
  }

  function start() {
    if (preference?.matches) return;
    document.querySelectorAll(".session-line").forEach((line, index) => {
      animate(line, [{ opacity: 0.55, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], {
        delay: index * 95,
      });
    });
    animate(document.querySelector(".session-output > span:last-child"), [
      { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" },
    ], { duration: 650, delay: 380, easing: "steps(30, end)" });
    document.querySelectorAll(".log-bars i").forEach((bar, index) => {
      animate(bar, [{ transform: "scaleY(.35)" }, { transform: "scaleY(1)" }], {
        duration: 250, delay: index * 18,
      });
    });
    animate(document.querySelector(".cursor"), [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], {
      duration: 1000, iterations: 3, easing: "steps(1, end)",
    });

    if (typeof IntersectionObserver !== "function") return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        // Only a slight arrival: sections are readable before and during motion.
        animate(target, [{ opacity: 0.7, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }]);
        observer.unobserve(target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll("main > .section").forEach((section) => observer.observe(section));
  }

  preference?.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    observer?.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  });
  // Feedback stays inside the focused demo, without consuming any keystrokes.
  document.querySelector("#try")?.addEventListener("keydown", (event) => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const panel = event.target.closest('[role="tabpanel"]');
    if (!panel) return;
    animate(panel.querySelector(".mode, .pill"), [
      { borderColor: "#eeeeee", backgroundColor: "#202020" },
      { borderColor: "#3a3a3a", backgroundColor: "#191919" },
    ], { duration: 140 });
  });
  start();
})();
