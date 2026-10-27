// Everything Vim site: nav, step tabs, and three live demos (hints / vim buffer / vomnibar).
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- toast ---------- */
  const toastEl = $("#toast");
  let toastTimer = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2600);
  }

  /* ---------- mobile nav ---------- */
  const toggle = $(".nav-toggle");
  const mobile = $(".nav-mobile");
  if (toggle && mobile) {
    function setMobile(open) {
      if (open) {
        mobile.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
      } else {
        mobile.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    }
    toggle.addEventListener("click", () => {
      setMobile(mobile.hasAttribute("hidden"));
    });
    $$("a", mobile).forEach((a) =>
      a.addEventListener("click", () => {
        setMobile(false);
      })
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !mobile.hasAttribute("hidden")) {
        setMobile(false);
        toggle.focus({ preventScroll: true });
      }
    });
    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 901px)").matches) {
        setMobile(false);
      }
    });
  }

  /* ---------- step tabs (arrow-key navigable) ---------- */
  const tabs = $$('[role="tablist"] .step[data-tab]');
  const panels = {
    navigate: $("#panel-navigate"),
    edit: $("#panel-edit"),
    command: $("#panel-command"),
  };
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
      t.tabIndex = active ? 0 : -1;
    });
    Object.entries(panels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== tab.dataset.tab;
    });
    if (focus) tab.focus({ preventScroll: false });
  }
  tabs.forEach((tab, i) => {
    const panel = panels[tab.dataset.tab];
    if (panel) {
      if (!tab.id) tab.id = `tab-${tab.dataset.tab}`;
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("aria-labelledby", tab.id);
    }
    tab.tabIndex = tab.classList.contains("is-active") ? 0 : -1;
    tab.addEventListener("click", () => selectTab(tab, false));
    tab.addEventListener("keydown", (e) => {
      let next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (i - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next >= 0) {
        e.preventDefault();
        selectTab(tabs[next], true);
      }
    });
  });

  /* ---------- demo 1: local page-navigation sandbox ---------- */
  const mockPage = $("#mockPage");
  const mockViewport = $("#mockViewport");
  const mockDocument = $(".mock-document", mockPage || document);
  const mockLinks = mockPage ? $$(".mock-links a", mockPage) : [];
  const hintStatus = $("#hintStatus");
  const hintMode = $("#hintMode");
  const hintStart = $("#hintStart");
  const demoTabs = $("#demoTabs");
  const findForm = $("#demoFind");
  const findInput = $("#demoFindInput");
  const findCount = $("#demoFindCount");
  const demoBrowser = {
    tabs: [
      { id: 1, history: [{ title: "Morning reading", url: "demo / morning-reading" }], index: 0 },
      { id: 2, history: [{ title: "Project docs", url: "demo / project-docs" }], index: 0 },
      { id: 3, history: [{ title: "Inbox", url: "demo / inbox" }], index: 0 },
    ],
    active: 0, nextId: 4, closed: [],
  };
  let hintsOn = false;
  let hintsNewTab = false;
  let pagePending = "";
  let findMatches = [];
  let findIndex = -1;
  const pageMarks = new Map();
  const pageStatus = (message) => { if (hintStatus) hintStatus.textContent = message; };
  const activeDemoTab = () => demoBrowser.tabs[demoBrowser.active];
  const demoTabEntry = (tab = activeDemoTab()) => tab.history[tab.index];

  function renderDemoTabs() {
    if (demoTabs) {
      demoTabs.replaceChildren();
      demoBrowser.tabs.forEach((tab, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-ink btn-sm demo-tab";
        button.textContent = demoTabEntry(tab).title;
        button.setAttribute("aria-pressed", String(index === demoBrowser.active));
        button.addEventListener("click", () => {
          selectDemoTab(index);
          mockPage?.focus({ preventScroll: true });
        });
        demoTabs.append(button);
      });
    }
    const url = $(".mock-url", mockPage || document);
    if (url) url.textContent = demoTabEntry().url;
    if (findInput?.value) updateDemoFind();
  }
  function selectDemoTab(index) {
    demoBrowser.active = (index + demoBrowser.tabs.length) % demoBrowser.tabs.length;
    renderDemoTabs();
    pageStatus(`Selected “${demoTabEntry().title}” — simulated tab ${demoBrowser.active + 1} of ${demoBrowser.tabs.length}.`);
  }
  function createDemoTab(title = "New tab", url = "about:newtab", activate = true) {
    const tab = { id: demoBrowser.nextId++, history: [{ title, url }], index: 0 };
    demoBrowser.tabs.push(tab);
    if (activate) demoBrowser.active = demoBrowser.tabs.length - 1;
    renderDemoTabs();
    pageStatus(`Opened “${title}” in a new ${activate ? "active" : "background"} tab (demo).`);
  }
  function navigateDemo(title, url) {
    const tab = activeDemoTab();
    tab.history.splice(tab.index + 1);
    tab.history.push({ title, url });
    tab.index++;
    renderDemoTabs();
    pageStatus(`Opened “${title}” in this tab (demo). H goes back; L goes forward.`);
  }
  function historyDemo(direction) {
    const tab = activeDemoTab();
    const next = Math.max(0, Math.min(tab.history.length - 1, tab.index + direction));
    if (next === tab.index) {
      pageStatus(`No ${direction < 0 ? "earlier" : "later"} entry in this demo tab. Follow a hint first.`);
      return;
    }
    tab.index = next;
    renderDemoTabs();
    pageStatus(`History ${direction < 0 ? "back" : "forward"}: “${demoTabEntry().title}” (demo).`);
  }
  function closeDemoTab() {
    if (demoBrowser.tabs.length === 1) {
      pageStatus("Keep one tab open in this sandbox. Press t to create another.");
      return;
    }
    const index = demoBrowser.active;
    const [tab] = demoBrowser.tabs.splice(index, 1);
    demoBrowser.closed.push({ tab, index });
    demoBrowser.active = Math.min(index, demoBrowser.tabs.length - 1);
    renderDemoTabs();
    pageStatus(`Closed “${demoTabEntry(tab).title}” (demo). X restores it.`);
  }
  function restoreDemoTab() {
    const closed = demoBrowser.closed.pop();
    if (!closed) { pageStatus("No closed demo tab to restore."); return; }
    demoBrowser.tabs.splice(closed.index, 0, closed.tab);
    selectDemoTab(demoBrowser.tabs.indexOf(closed.tab));
    pageStatus(`Restored “${demoTabEntry().title}” (demo).`);
  }
  function scrollDemo(x, y, end) {
    if (!mockViewport) return;
    const maxY = Math.max(0, mockViewport.scrollHeight - mockViewport.clientHeight);
    const maxX = Math.max(0, mockViewport.scrollWidth - mockViewport.clientWidth);
    mockViewport.scrollTop = end === "top" ? 0 : end === "bottom" ? maxY
      : Math.max(0, Math.min(maxY, mockViewport.scrollTop + y));
    mockViewport.scrollLeft = Math.max(0, Math.min(maxX, mockViewport.scrollLeft + x));
    pageStatus(`Demo scroll: ${Math.round(mockViewport.scrollTop)}px down, ${Math.round(mockViewport.scrollLeft)}px across.`);
  }
  function showFindMatch() {
    findMatches.forEach((mark, index) => mark.classList.toggle("is-current", index === findIndex));
    const mark = findMatches[findIndex];
    if (mark && mockViewport) {
      const rect = mark.getBoundingClientRect();
      const viewportRect = mockViewport.getBoundingClientRect();
      const top = mockViewport.scrollTop + rect.top - viewportRect.top - mockViewport.clientHeight / 2;
      mockViewport.scrollTop = Math.max(0, Math.min(mockViewport.scrollHeight - mockViewport.clientHeight, top));
    }
    const label = findMatches.length ? `${findIndex + 1} / ${findMatches.length}` : "0 matches";
    if (findCount) findCount.textContent = label;
    pageStatus(findInput?.value ? `Find “${findInput.value}”: ${label}. n next; N previous.` : "Type to find in the demo page.");
  }
  function updateDemoFind() {
    if (!mockDocument) return;
    $$("mark.demo-match", mockDocument).forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent)));
    mockDocument.normalize();
    findMatches = [];
    findIndex = -1;
    const query = (findInput?.value || "").toLowerCase();
    if (query) {
      const walker = document.createTreeWalker(mockDocument, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.parentElement.closest(".hint-badge")) nodes.push(walker.currentNode);
      }
      nodes.forEach((node) => {
        const value = node.textContent;
        const lower = value.toLowerCase();
        let start = 0;
        let at = lower.indexOf(query);
        if (at < 0) return;
        const fragment = document.createDocumentFragment();
        while (at >= 0) {
          fragment.append(document.createTextNode(value.slice(start, at)));
          const mark = document.createElement("mark");
          mark.className = "demo-match";
          mark.textContent = value.slice(at, at + query.length);
          fragment.append(mark);
          findMatches.push(mark);
          start = at + query.length;
          at = lower.indexOf(query, start);
        }
        fragment.append(document.createTextNode(value.slice(start)));
        node.replaceWith(fragment);
      });
      if (findMatches.length) findIndex = 0;
    }
    showFindMatch();
  }
  function nextDemoFind(direction) {
    if (!findMatches.length) { pageStatus("No find matches. Press / and type a search."); return; }
    findIndex = (findIndex + direction + findMatches.length) % findMatches.length;
    showFindMatch();
  }
  function setHintMode(label, active) {
    if (!hintMode) return;
    hintMode.textContent = label;
    hintMode.classList.toggle("is-live", !!active);
  }
  function showHints(newTab = false) {
    if (!mockPage || hintsOn) return;
    hintsOn = true;
    hintsNewTab = newTab;
    pagePending = "";
    if (hintStart) {
      hintStart.setAttribute("aria-pressed", "true");
      hintStart.textContent = "Hide hints";
    }
    $(".mock-links", mockPage)?.classList.add("hints-on");
    mockLinks.forEach((a) => {
      const badge = document.createElement("span");
      badge.className = "hint-badge";
      badge.textContent = (a.dataset.hint || "?").toUpperCase();
      a.prepend(badge);
    });
    setHintMode("Hints — press a letter", true);
    pageStatus(`${newTab ? "New-tab hints" : "Hints"}: press A, S, D, or F; Esc dismisses.`);
  }
  function hideHints(message = "Hints dismissed. Press f to show them again.") {
    hintsOn = false;
    hintsNewTab = false;
    if (hintStart) {
      hintStart.setAttribute("aria-pressed", "false");
      hintStart.textContent = "Show hints";
    }
    $(".mock-links", mockPage || document)?.classList.remove("hints-on");
    $$(".hint-badge", mockPage || document).forEach((badge) => badge.remove());
    setHintMode("Idle", false);
    pageStatus(message);
  }
  function followHint(key, newTab) {
    const link = mockLinks.find((a) => (a.dataset.hint || "").toLowerCase() === key.toLowerCase());
    if (!link) return;
    hideHints();
    if (newTab) createDemoTab(link.dataset.name, `demo / ${link.dataset.name.toLowerCase().replaceAll(" ", "-")}`, false);
    else navigateDemo(link.dataset.name, `demo / ${link.dataset.name.toLowerCase().replaceAll(" ", "-")}`);
    toast(`${newTab ? "Opened in a background tab" : "Opened"}: “${link.dataset.name}” (demo)`);
  }
  hintStart?.setAttribute("aria-pressed", "false");
  hintStart?.addEventListener("click", () => {
    if (hintsOn) hideHints();
    else showHints();
    mockPage?.focus({ preventScroll: true });
  });
  findInput?.addEventListener("input", updateDemoFind);
  findForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    findForm.hidden = true;
    mockPage?.focus({ preventScroll: true });
  });
  findInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      findForm.hidden = true;
      mockPage?.focus({ preventScroll: true });
    }
  });
  if (mockPage) {
    renderDemoTabs();
    mockPage.addEventListener("keydown", (event) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key;
      if (key === "Escape") {
        pagePending = "";
        if (hintsOn) { event.preventDefault(); hideHints(); }
        return;
      }
      if (hintsOn) {
        event.preventDefault();
        if (/^[a-zA-Z]$/.test(key)) followHint(key, hintsNewTab || event.shiftKey);
        return;
      }
      if (pagePending === "m" || pagePending === "`") {
        event.preventDefault();
        if (/^[a-zA-Z]$/.test(key)) {
          const register = /^[A-Z]$/.test(key) ? `global:${key}` : `${demoTabEntry().url}:${key}`;
          if (pagePending === "m") {
            pageMarks.set(register, {
              tabId: activeDemoTab().id, ...demoTabEntry(),
              top: mockViewport.scrollTop, left: mockViewport.scrollLeft,
            });
            pageStatus(`Set demo mark “${key}”. Press \`${key} to jump back.`);
          } else {
            const mark = pageMarks.get(register);
            if (mark) {
              const index = demoBrowser.tabs.findIndex((tab) => tab.id === mark.tabId);
              if (/^[A-Z]$/.test(key)) {
                if (index >= 0) selectDemoTab(index);
                if (demoTabEntry().url !== mark.url) navigateDemo(mark.title, mark.url);
              }
              mockViewport.scrollTop = mark.top;
              mockViewport.scrollLeft = mark.left;
              pageStatus(`Jumped to demo mark “${key}”.`);
            } else pageStatus(`Demo mark “${key}” is not set.`);
          }
        }
        pagePending = "";
        return;
      }
      const previous = pagePending;
      pagePending = "";
      if (previous === "g" && ["g", "t", "T", "i"].includes(key)) {
        event.preventDefault();
        if (key === "g") scrollDemo(0, 0, "top");
        else if (key === "i") {
          const editTab = tabs.find((tab) => tab.dataset.tab === "edit");
          if (editTab) selectTab(editTab, false);
          area?.focus({ preventScroll: true });
        }
        else selectDemoTab(demoBrowser.active + (key === "t" ? 1 : -1));
        return;
      }
      const halfPage = (mockViewport?.clientHeight || 230) / 2;
      const actions = {
        h: () => scrollDemo(-60, 0), j: () => scrollDemo(0, 60),
        k: () => scrollDemo(0, -60), l: () => scrollDemo(60, 0),
        d: () => scrollDemo(0, halfPage), u: () => scrollDemo(0, -halfPage),
        G: () => scrollDemo(0, 0, "bottom"),
        f: () => showHints(), F: () => showHints(true),
        g: () => { pagePending = "g"; },
        m: () => { pagePending = "m"; pageStatus("Set mark: press a letter."); },
        "`": () => { pagePending = "`"; pageStatus("Jump to mark: press a letter."); },
        "/": () => { findForm.hidden = false; findInput.focus({ preventScroll: true }); },
        n: () => nextDemoFind(1), N: () => nextDemoFind(-1),
        J: () => selectDemoTab(demoBrowser.active - 1), K: () => selectDemoTab(demoBrowser.active + 1),
        t: () => createDemoTab(), x: closeDemoTab, X: restoreDemoTab,
        H: () => historyDemo(-1), L: () => historyDemo(1),
        o: () => activateVomDemo("o"), O: () => activateVomDemo("O"),
        T: () => activateVomDemo("T"), b: () => activateVomDemo("b"),
        B: () => activateVomDemo("B"), ":": () => activateVomDemo(":"),
      };
      if (actions[key]) { event.preventDefault(); actions[key](); }
    });
    mockLinks.forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      followHint(link.dataset.hint || "", hintsOn && hintsNewTab || event.shiftKey);
    }));
  }

  // Editing is owned by demo-editor.js and the source-derived Vim engine.
  const area = $("#vimBuffer");

  /* ---------- demo 3: scoped Vomnibar sandbox ---------- */
  const ENTRIES = [
    { kind: "bookmark", title: "Vimium commands reference", url: "vimium.github.io/commands" },
    { kind: "bookmark", title: "Google Docs — Q3 planning", url: "docs.google.com/document/…" },
    { kind: "history", title: "Hacker News — front page", url: "news.ycombinator.com" },
    { kind: "history", title: "GitHub — B-Eddie/allinvim", url: "github.com/B-Eddie/allinvim" },
    { kind: "history", title: "MDN — Selection API", url: "developer.mozilla.org/…" },
  ];
  const COMMANDS = [
    { title: "Scroll to top", url: "scrollToTop", run: () => scrollDemo(0, 0, "top") },
    { title: "Scroll to bottom", url: "scrollToBottom", run: () => scrollDemo(0, 0, "bottom") },
    { title: "Create a new tab", url: "createTab", run: () => createDemoTab() },
    { title: "Close current tab", url: "removeTab", run: closeDemoTab },
    { title: "Restore closed tab", url: "restoreTab", run: restoreDemoTab },
    { title: "Show help", url: "showHelp", run: openHelp },
  ].map((entry) => ({ kind: "command", ...entry }));
  const vomDemo = $("#vomDemo");
  const vomInput = $("#vomInput");
  const vomList = $("#vomList");
  const vomStatus = document.createElement("p");
  vomStatus.id = "vomStatus";
  vomStatus.className = "mock-status";
  vomStatus.setAttribute("role", "status");
  vomStatus.textContent = "Demo results. Focus this sandbox and press o, O, T, b, B, or :. Browser actions stay here.";
  vomDemo?.after(vomStatus);
  let vomMode = "o";
  let selIdx = 0;
  let vomRows = [];
  function vomEntries() {
    const tabEntries = demoBrowser.tabs.map((tab) => ({
      kind: "tab", title: demoTabEntry(tab).title, url: demoTabEntry(tab).url, tabId: tab.id,
    }));
    if (vomMode === ":") return COMMANDS;
    if (vomMode === "T") return tabEntries;
    if (vomMode === "b" || vomMode === "B") return ENTRIES.filter((entry) => entry.kind === "bookmark");
    return [...tabEntries, ...ENTRIES];
  }
  function renderVom(filter = "") {
    if (!vomList) return;
    const query = filter.trim().toLowerCase();
    vomRows = vomEntries().filter((entry) =>
      !query || entry.title.toLowerCase().includes(query) || entry.url.toLowerCase().includes(query)
    );
    selIdx = Math.min(selIdx, Math.max(0, vomRows.length - 1));
    vomList.replaceChildren();
    if (!vomRows.length) {
      const empty = document.createElement("li");
      empty.className = "vom-empty";
      empty.setAttribute("role", "option");
      empty.setAttribute("aria-disabled", "true");
      empty.textContent = ["o", "O"].includes(vomMode)
        ? `No saved match — Enter opens “${filter}” as a URL or search (demo).`
        : "No matching demo results. Try another search.";
      vomList.append(empty);
      vomInput?.removeAttribute("aria-activedescendant");
      return;
    }
    vomRows.forEach((entry, index) => {
      const li = document.createElement("li");
      li.id = `vom-option-${index}`;
      li.classList.toggle("is-sel", index === selIdx);
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(index === selIdx));
      for (const [className, value] of [
        [`vom-kind ${entry.kind}`, entry.kind], ["vom-title", entry.title], ["vom-url", entry.url],
      ]) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = value;
        li.append(span);
      }
      li.addEventListener("click", () => { selIdx = index; executeVom(); });
      vomList.append(li);
    });
    vomInput?.setAttribute("aria-activedescendant", `vom-option-${selIdx}`);
  }
  function activateVomDemo(key) {
    if (!vomInput || !vomDemo) return;
    vomMode = key;
    vomDemo.dataset.mode = key;
    const commandTab = tabs.find((tab) => tab.dataset.tab === "command");
    if (commandTab) selectTab(commandTab, false);
    const labels = {
      o: "Open a URL, bookmark, or history entry", O: "Open in a new tab",
      T: "Search open tabs", b: "Search bookmarks", B: "Open a bookmark in a new tab",
      ":": "Search Everything Vim commands",
    };
    vomInput.placeholder = labels[key];
    const badge = $(".vom-input kbd", vomDemo);
    if (badge) badge.textContent = key;
    vomInput.value = "";
    selIdx = 0;
    renderVom();
    vomStatus.textContent = `${labels[key]} (demo). Esc returns to the sandbox; browser actions stay here.`;
    vomInput.focus({ preventScroll: true });
  }
  function executeVom() {
    const entry = vomRows[selIdx];
    if (entry?.kind === "command") {
      // Give help a stable return target when it is the selected command.
      vomDemo?.focus({ preventScroll: true });
      entry.run();
      vomStatus.textContent = `Executed ${entry.url} (demo).`;
    } else if (entry?.kind === "tab") {
      selectDemoTab(demoBrowser.tabs.findIndex((tab) => tab.id === entry.tabId));
      vomStatus.textContent = `Switched to “${entry.title}” (demo).`;
    } else if (entry || ["o", "O"].includes(vomMode) && vomInput?.value.trim()) {
      const title = entry?.title || vomInput.value.trim();
      const url = entry?.url || title;
      const newTab = vomMode === "O" || vomMode === "B";
      if (newTab) createDemoTab(title, url);
      else navigateDemo(title, url);
      vomStatus.textContent = `Opened “${title}” ${newTab ? "in a new tab" : "in this tab"} (demo).`;
    } else {
      vomStatus.textContent = "No matching demo result to open.";
    }
    toast(vomStatus.textContent);
    // Commands such as showHelp own focus after execution.
    if (!backdrop || backdrop.hidden) vomDemo?.focus({ preventScroll: true });
  }
  if (vomDemo && vomInput && vomList) {
    vomDemo.dataset.mode = vomMode;
    vomInput.setAttribute("role", "combobox");
    vomInput.setAttribute("aria-autocomplete", "list");
    vomInput.setAttribute("aria-controls", vomList.id);
    vomInput.setAttribute("aria-expanded", "true");
    vomList.setAttribute("role", "listbox");
    vomList.setAttribute("aria-label", "Matching demo results");
    vomList.setAttribute("aria-live", "polite");
    renderVom();
    vomDemo.addEventListener("keydown", (event) => {
      if (event.target !== vomDemo || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (["o", "O", "T", "b", "B", ":"].includes(event.key)) {
        event.preventDefault();
        activateVomDemo(event.key);
      }
    });
    vomInput.addEventListener("input", () => { selIdx = 0; renderVom(vomInput.value); });
    vomInput.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        selIdx = Math.max(0, Math.min(vomRows.length - 1, selIdx + (event.key === "ArrowDown" ? 1 : -1)));
        renderVom(vomInput.value);
      } else if (event.key === "Enter") {
        event.preventDefault();
        executeVom();
      } else if (event.key === "Escape") {
        event.preventDefault();
        vomStatus.textContent = "Vomnibar dismissed (demo). Press o, O, T, b, B, or : to choose a mode.";
        vomDemo.focus({ preventScroll: true });
      }
    });
  }

  /* ---------- help overlay (?) ---------- */
  const backdrop = $("#helpBackdrop");
  const helpOpen = $("#helpOpen");
  const helpClose = $("#helpClose");
  let helpReturnFocus = null;
  let previousBodyOverflow = "";
  function openHelp() {
    if (!backdrop || !backdrop.hidden) return;
    helpReturnFocus = document.activeElement;
    backdrop.hidden = false;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (helpClose) helpClose.focus({ preventScroll: true });
  }
  function closeHelp() {
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    if (helpReturnFocus && document.contains(helpReturnFocus)) {
      helpReturnFocus.focus({ preventScroll: true });
    }
  }
  if (helpOpen) helpOpen.addEventListener("click", openHelp);
  if (helpClose) helpClose.addEventListener("click", closeHelp);
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeHelp();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (backdrop && !backdrop.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHelp();
        return;
      }
      if (e.key === "Tab") {
        const focusable = $$(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]',
          backdrop,
        ).filter((el) => el.tabIndex >= 0 && !el.closest("[hidden]"));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first && (e.shiftKey
          ? document.activeElement === first || !backdrop.contains(document.activeElement)
          : document.activeElement === last || !backdrop.contains(document.activeElement))) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
      return;
    }
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" ||
      (document.activeElement && document.activeElement.isContentEditable);
    if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
      // Let the vim buffer and vomnibar keep their own "?" keystrokes.
      if (document.activeElement === area || document.activeElement === vomInput) return;
      if (typing) return;
      e.preventDefault();
      openHelp();
    }
  });
})();
