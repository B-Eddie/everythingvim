// Keep every install action on the visitor's browser store. HTML defaults to Chrome.
(() => {
  "use strict";

  const stores = Object.freeze({
    chrome: {
      name: "Chrome",
      url: "https://chromewebstore.google.com/detail/general-vim/mglliapjiolajkmcfaombcifockgaekc?authuser=0&hl=en",
    },
    firefox: {
      name: "Firefox",
      url: "https://addons.mozilla.org/en-US/firefox/addon/everything-vim/",
    },
  });

  function detectBrowser(userAgent = "") {
    // Edge, Opera, and other Chromium browsers all use the Chrome Web Store.
    if (/\b(?:Edg(?:e|A|iOS)?|Chrome|Chromium|CriOS|OPR)\//i.test(userAgent)) return "chrome";
    return /\b(?:Firefox|FxiOS)\//i.test(userAgent) ? "firefox" : "chrome";
  }

  function updateButtons(root, userAgent) {
    const platform = detectBrowser(userAgent);
    const primary = stores[platform];
    const secondary = stores[platform === "firefox" ? "chrome" : "firefox"];
    root.querySelectorAll("[data-install-primary]").forEach((link) => {
      link.href = primary.url;
      link.textContent = `Add to ${primary.name}`;
      link.dataset.installPlatform = platform;
    });
    root.querySelectorAll("[data-install-secondary]").forEach((link) => {
      link.href = secondary.url;
      link.textContent = `Also on ${secondary.name}`;
    });
    return platform;
  }

  // Pure detection and DOM updates are also usable by the local regression checks.
  if (typeof module === "object" && module.exports) {
    module.exports = { detectBrowser, updateButtons, stores };
  }
  if (typeof document !== "undefined") {
    updateButtons(document, navigator.userAgent);
  }
})();
