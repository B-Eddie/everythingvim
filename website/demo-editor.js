// Host the source-derived Vim engine in one local textarea sandbox.
(() => {
  "use strict";

  const area = document.querySelector("#vimBuffer");
  if (!area) return;
  const pill = document.querySelector("#editMode");
  const status = document.querySelector("#surfaceStatus");
  const keyLog = document.querySelector("#keyLog");
  const buttons = [...document.querySelectorAll("[data-demo-surface]")];
  const samples = {
    field: area.defaultValue,
    docs: 'Planning notes\n\nChange "these words" with ci".\nDelete (this group) with da(.\nSelect a line with V, then y or d.',
    code: 'const message = "hello browser";\nconst enabled = true;\n\nfunction greet() {\n  return message;\n}',
  };
  const values = { ...samples };
  const recentKeys = [];
  const parser = new window.VimMotionParser(window.__EVERYTHINGVIM_MOTIONS);
  let surface = "field";
  let mode = "insert";
  let executor;
  let insertStart = null;
  let insertPreviousChange = null;
  let insertHistory = null;
  const insertCommands = ["insert_before", "insert_start_line", "append_after", "append_end_line"];

  // The engine only sees this sandbox, never another field on the page.
  window.__VIM_CURRENT_EDITOR__ = () => area;

  function message(text) {
    if (status) status.textContent = text;
  }

  function renderMode() {
    if (pill) {
      pill.textContent = { normal: "Normal", insert: "Insert", visual: "Visual", visualLine: "Visual line" }[mode] || mode;
      pill.classList.toggle("is-live", mode !== "insert");
    }
    area.classList.toggle("is-normal", mode !== "insert");
  }

  function setMode(next) {
    if (next === "insert" && mode !== "insert") {
      insertStart = { value: area.value, pos: area.selectionStart };
      insertPreviousChange = executor._lastChange;
    }
    if (mode === "insert" && next !== "insert" && insertStart) {
      // Keep native typing with its initiating engine command for dot repeat.
      if (area.value === insertStart.value && insertCommands.includes(executor._lastChange?.id)) {
        executor.setLastChange(insertPreviousChange);
        if (insertHistory) {
          executor._undoStack.length = insertHistory.undoLength;
          executor._redoStack = insertHistory.redo;
        }
      } else executor.finishInsert(insertStart.value, insertStart.pos);
      insertStart = null;
      insertPreviousChange = null;
      insertHistory = null;
    }
    mode = next;
    parser.setMode(mode);
    renderMode();
  }

  function newExecutor() {
    executor = window.createVimExecutor({
      getMode: () => mode,
      setMode,
      isVisual: () => mode === "visual" || mode === "visualLine",
      showMessage: message,
      openOverlay: () => chooseSurface("code"),
      feedKey: (token) => executeToken(token),
    });
    parser.reset();
    insertStart = null;
    insertPreviousChange = null;
    insertHistory = null;
  }

  function chooseSurface(next, reset = false) {
    // Re-clicking the active surface is a no-op: reloading the saved value
    // would silently discard unsaved code-overlay edits.
    if (next === surface && !reset) return;
    // Leaving an open overlay without saving discards its draft.
    if (surface !== "code") values[surface] = area.value;
    surface = next;
    if (reset) values[surface] = samples[surface];
    area.value = values[surface];
    area.setSelectionRange(0, 0);
    mode = surface === "code" ? "normal" : "insert";
    parser.setMode(mode);
    newExecutor();
    if (mode === "insert") {
      executor._saveUndoState();
      insertStart = { value: area.value, pos: 0 };
    }
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.demoSurface === surface)));
    recentKeys.length = 0;
    if (keyLog) keyLog.textContent = "—";
    renderMode();
    message(surface === "code"
      ? "Code overlay: Normal. Esc saves; Ctrl+C discards."
      : surface === "docs"
        ? "Docs text model: Insert. Esc enters Normal; Esc keeps document focus."
        : "Text field: Insert. Esc enters Normal; a second Esc blurs.");
    area.focus({ preventScroll: true });
  }

  function executeToken(token) {
    const result = parser.feed(token);
    if (!result || ["prefix", "await_char", "invalid"].includes(result.kind)) return;
    const activeExecutor = executor;
    const before = { value: area.value, s: area.selectionStart, e: area.selectionEnd };
    const undoLength = executor._undoStack.length;
    const id = result.command?.id;
    const history = insertCommands.includes(id)
      ? { undoLength, redo: executor._redoStack.slice() } : null;
    // Undo captures the cursor before an operator expands its selection.
    executor.exec(result);
    if (executor !== activeExecutor) return;
    if (history && mode === "insert") insertHistory = history;
    if (area.value !== before.value && id !== "undo" && id !== "redo") {
      executor._undoStack.length = undoLength;
      executor._undoStack.push(before);
      executor._redoStack.length = 0;
    }
    if (mode === "insert" && id && !id.startsWith("exit_") && id !== "repeat") {
      executor.setLastChange({ type: "command", id, count: result.count || 1 });
    }
    renderMode();
  }

  function tokenFor(event) {
    if (event.metaKey || event.altKey) return null;
    if (event.ctrlKey) return `<C-${event.key.toUpperCase()}>`;
    return { Escape: "<ESC>", Enter: "<CR>", Backspace: "<BS>", Tab: "<TAB>",
      ArrowLeft: "h", ArrowRight: "l", ArrowUp: "k", ArrowDown: "j" }[event.key] ||
      (event.key.length === 1 ? event.key : null);
  }

  area.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    const token = tokenFor(event);
    if (!token) return;
    recentKeys.push(event.key === "Escape" ? "esc" : event.ctrlKey ? `Ctrl+${event.key}` : event.key === " " ? "space" : event.key);
    if (recentKeys.length > 6) recentKeys.shift();
    if (keyLog) keyLog.textContent = recentKeys.join(" ");

    if (surface === "code" && (token === "<ESC>" || token === "<C-C>")) {
      event.preventDefault();
      if (token === "<ESC>") {
        if (mode === "insert") executeToken("<ESC>");
        values.code = area.value;
        message("Code overlay saved (demo). Choose Code overlay to reopen.");
      } else {
        area.value = values.code;
        message("Code overlay discarded (demo). Choose Code overlay to reopen.");
      }
      parser.reset();
      setMode("normal");
      area.blur();
      return;
    }

    if (token === "<ESC>" && parser.hasPending()) {
      event.preventDefault();
      parser.reset();
      return;
    }
    if (mode === "insert") {
      // Native input, clipboard shortcuts, IME, and cursor keys remain native.
      if (!event.ctrlKey && token !== "<ESC>") return;
      if (!parser.isCommandBinding(token) && !parser.hasPending()) return;
    } else {
      if (event.key === "Tab" || (event.ctrlKey && !parser.isBinding(token))) return;
      if (mode === "normal" && token === "<ESC>") {
        event.preventDefault();
        parser.reset();
        if (surface === "field") area.blur();
        return;
      }
    }
    event.preventDefault();
    executeToken(token);
  });

  // Preserve keyboard selections after pointer placement and mode changes.
  area.addEventListener("focus", renderMode);
  buttons.forEach((button) => button.addEventListener("click", () => chooseSurface(button.dataset.demoSurface)));
  document.querySelector("#demoReset")?.addEventListener("click", () => chooseSurface(surface, true));
  newExecutor();
  executor._saveUndoState();
  insertStart = { value: area.value, pos: area.selectionStart };
  parser.setMode(mode);
  renderMode();
  message("Text field: Insert. Esc enters Normal; a second Esc blurs.");
})();
