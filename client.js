window.__ModuleLoader__.load({ id: "dsh-model-search", factory: () => {
var DSHModelSearch = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client-entry.js
  var client_entry_exports = {};
  __export(client_entry_exports, {
    apply: () => apply,
    inject: () => inject
  });

  // lib/directory.js
  function currentSessionId(sessions) {
    const current = sessions?.list?.getSnapshot?.()?.current;
    if (typeof current === "string") return current;
    return current?.sessionId ?? current?.id;
  }
  function bindCurrentDirectory({ sessions, modelDirectories, onSnapshot, onWarning = () => {
  } }) {
    let stopped = false;
    let sessionId;
    let unsubscribeDirectory = () => {
    };
    const publish = (value) => {
      if (!stopped) onSnapshot?.(value);
    };
    const rebind = () => {
      const nextId = currentSessionId(sessions);
      if (nextId === sessionId) return;
      sessionId = nextId;
      unsubscribeDirectory();
      unsubscribeDirectory = () => {
      };
      if (!nextId || typeof modelDirectories?.directoryFor !== "function") {
        publish(null);
        return;
      }
      try {
        const directory = modelDirectories.directoryFor(nextId);
        const emit = () => publish(directory?.store?.getSnapshot?.() ?? null);
        emit();
        if (typeof directory?.store?.subscribe === "function") {
          unsubscribeDirectory = directory.store.subscribe(emit);
        }
        Promise.resolve(directory?.load?.()).catch(onWarning);
      } catch (error) {
        publish(null);
        onWarning(error);
      }
    };
    const unsubscribeSessions = sessions?.list?.subscribe?.(rebind) ?? (() => {
    });
    rebind();
    return () => {
      if (stopped) return;
      stopped = true;
      unsubscribeSessions();
      unsubscribeDirectory();
    };
  }

  // lib/filter.js
  function normalizeQuery(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
  }
  function modelMatches(group, model, query) {
    const needle = normalizeQuery(query);
    if (!needle) return true;
    return [group?.id, group?.name, model?.id, model?.name, model?.description].some((value) => normalizeQuery(value).includes(needle));
  }

  // lib/dom.js
  function normalized(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
  }
  function sectionLabel(section) {
    const labelledBy = section.getAttribute("aria-labelledby");
    const labelled = labelledBy && section.ownerDocument.getElementById(labelledBy);
    const heading = section.querySelector("h1,h2,h3,h4,h5,h6");
    return (labelled?.textContent ?? heading?.textContent ?? section.firstElementChild?.textContent ?? "").trim();
  }
  function rowLabel(row) {
    return (row.getAttribute("title") ?? row.getAttribute("aria-label") ?? row.textContent ?? "").trim();
  }
  function groupMatchesLabel(group, label) {
    const value = normalized(label);
    return value !== "" && [group?.id, group?.name].some((candidate) => normalized(candidate) === value);
  }
  function semanticMapping(sections, groups) {
    const entries = [];
    for (const mapped of sections) {
      const label = sectionLabel(mapped.section);
      const matches = groups.filter((group2) => groupMatchesLabel(group2, label));
      const group = matches.length === 1 ? matches[0] : { id: label, name: label, models: [] };
      for (const row of mapped.rows) {
        const visible = normalized(rowLabel(row));
        const models = matches.length === 1 ? (group.models ?? []).filter((model) => [model?.name, model?.id].some((value) => normalized(value) === visible)) : [];
        entries.push({ group, model: models[0], models, row, section: mapped.section });
      }
    }
    return { entries, sections: sections.map(({ section }) => section), mode: "semantic" };
  }
  function mapGroupedModelRows(root, groups, { semanticFallback = false } = {}) {
    if (!root || !Array.isArray(groups)) return null;
    const sections = [...root.querySelectorAll('section[role="group"]')].map((section) => ({ section, rows: [...section.querySelectorAll('button[role="menuitemradio"]')] })).filter(({ rows }) => rows.length > 0);
    if (sections.length === 0) return null;
    const structurallyCompatible = sections.length === groups.length && sections.every((mapped, index) => {
      const label = sectionLabel(mapped.section);
      const models = groups[index]?.models ?? [];
      return (!label || groupMatchesLabel(groups[index], label)) && mapped.rows.length === models.length && mapped.rows.every((row, modelIndex) => {
        const visible = normalized(rowLabel(row));
        const model = models[modelIndex];
        return [model?.name, model?.id].some((value) => normalized(value) === visible);
      });
    });
    if (!structurallyCompatible) return semanticFallback ? semanticMapping(sections, groups) : null;
    const entries = [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      const mapped = sections[groupIndex];
      const models = Array.isArray(group?.models) ? group.models : [];
      if (mapped.rows.length !== models.length) return semanticFallback ? semanticMapping(sections, groups) : null;
      for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
        entries.push({
          group,
          model: models[modelIndex],
          models: [models[modelIndex]],
          row: mapped.rows[modelIndex],
          section: mapped.section
        });
      }
    }
    return { entries, sections: sections.map(({ section }) => section), mode: "structural" };
  }

  // lib/composer.js
  var controllers = /* @__PURE__ */ new WeakMap();
  var warned = /* @__PURE__ */ new WeakSet();
  var controlSequence = 0;
  function isComposerModelMenu(root) {
    if (root?.getAttribute?.("role") !== "menu") return false;
    const label = root.getAttribute("aria-label") ?? "";
    return /model.*reasoning|模型.*推理/i.test(label);
  }
  function warnIncompatible(root, onWarning) {
    if (warned.has(root)) return;
    warned.add(root);
    onWarning("dsh-model-search: official composer model DOM is incompatible; enhancement disabled");
  }
  function decorateComposerMenu(root, groups, { locale = "en", onWarning = console.warn } = {}) {
    if (controllers.has(root)) return controllers.get(root);
    if (!isComposerModelMenu(root)) return null;
    const mapping = mapGroupedModelRows(root, groups, { semanticFallback: true });
    if (!mapping) {
      warnIncompatible(root, onWarning);
      return null;
    }
    const document = root.ownerDocument;
    const wrapper = document.createElement("div");
    wrapper.dataset.dshModelSearch = "composer";
    wrapper.style.cssText = "padding:8px;position:sticky;top:0;z-index:1;background:inherit";
    const input = document.createElement("input");
    input.type = "search";
    input.autocomplete = "off";
    input.placeholder = locale.startsWith("zh") ? "\u641C\u7D22\u6A21\u578B\u540D\u79F0\u3001\u63D0\u4F9B\u5546\u6216\u6A21\u578B ID" : "Search name, provider, or model ID";
    input.setAttribute("aria-label", input.placeholder);
    input.style.cssText = "box-sizing:border-box;width:100%;border:1px solid currentColor;border-radius:8px;padding:7px 9px;background:transparent;color:inherit;font:inherit";
    wrapper.append(input);
    const empty = document.createElement("div");
    empty.dataset.dshModelSearch = "empty";
    empty.textContent = locale.startsWith("zh") ? "\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B" : "No matching models";
    empty.style.cssText = "padding:12px;opacity:.7;text-align:center";
    empty.hidden = true;
    const container = mapping.sections[0].parentElement;
    container.insertBefore(wrapper, mapping.sections[0]);
    container.append(empty);
    let visible = mapping.entries;
    let activeIndex = -1;
    const controlId = ++controlSequence;
    const assignedIds = /* @__PURE__ */ new Set();
    const activate = (entry, index) => {
      if (!entry.row.id) {
        entry.row.id = `dsh-model-search-composer-${controlId}-${index}`;
        assignedIds.add(entry.row);
      }
      input.setAttribute("aria-activedescendant", entry.row.id);
      entry.row.scrollIntoView?.({ block: "nearest" });
    };
    const applyFilter = () => {
      visible = [];
      const query = input.value;
      for (const entry of mapping.entries) {
        const match = entry.models.length === 0 ? true : entry.models.some((model) => modelMatches(entry.group, model, query));
        entry.row.hidden = !match;
        if (match) visible.push(entry);
      }
      for (const section of mapping.sections) {
        section.hidden = !mapping.entries.some((entry) => entry.section === section && !entry.row.hidden);
      }
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
      empty.hidden = visible.length !== 0;
    };
    const onInput = () => applyFilter();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && input.value) {
        event.preventDefault();
        event.stopPropagation();
        input.value = "";
        applyFilter();
        return;
      }
      const handled = event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter";
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      if (!visible.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeIndex = activeIndex < 0 ? direction > 0 ? 0 : visible.length - 1 : (activeIndex + direction + visible.length) % visible.length;
        activate(visible[activeIndex], activeIndex);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        visible[activeIndex].row.click();
      }
    };
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown);
    const control = {
      input,
      destroy() {
        input.removeEventListener("input", onInput);
        input.removeEventListener("keydown", onKeyDown);
        for (const entry of mapping.entries) entry.row.hidden = false;
        for (const row of assignedIds) row.removeAttribute("id");
        for (const section of mapping.sections) section.hidden = false;
        wrapper.remove();
        empty.remove();
        controllers.delete(root);
      }
    };
    controllers.set(root, control);
    input.focus();
    return control;
  }

  // lib/model-command.js
  var controllers2 = /* @__PURE__ */ new WeakMap();
  var warned2 = /* @__PURE__ */ new WeakSet();
  var controlSequence2 = 0;
  function nativeSearch(card) {
    return [...card?.querySelectorAll?.("input") ?? []].find((input) => /filter options|筛选选项/i.test(input.getAttribute("aria-label") ?? ""));
  }
  function isModelCommandPopup(card) {
    if (!nativeSearch(card)) return false;
    const listbox = card.querySelector?.('[role="listbox"]');
    return /\/model\b/i.test(listbox?.getAttribute("aria-label") ?? "");
  }
  function mapRows(card, directory) {
    const rows = [...card.querySelectorAll('[role="listbox"] [role="option"]')];
    const entries = [];
    for (const group of directory?.groups ?? []) {
      for (const model of group.models ?? []) entries.push({ group, model });
    }
    for (const failure of directory?.failures ?? []) {
      entries.push({
        group: { id: failure.id, name: failure.name },
        model: { id: `failure/${failure.id}`, name: failure.name, description: failure.message }
      });
    }
    if (rows.length !== entries.length) return null;
    return entries.map((entry, index) => ({ ...entry, row: rows[index] }));
  }
  function warnIncompatible2(card, onWarning) {
    if (warned2.has(card)) return;
    warned2.add(card);
    onWarning("dsh-model-search: official /model DOM is incompatible; enhancement disabled");
  }
  function decorateModelCommand(card, directory, { locale = "en", onWarning = console.warn } = {}) {
    if (controllers2.has(card)) return controllers2.get(card);
    if (!isModelCommandPopup(card)) return null;
    const entries = mapRows(card, directory);
    if (!entries) {
      warnIncompatible2(card, onWarning);
      return null;
    }
    const native = nativeSearch(card);
    const document = card.ownerDocument;
    const input = document.createElement("input");
    input.type = "search";
    input.autocomplete = "off";
    input.dataset.dshModelSearch = "model-command";
    input.placeholder = locale.startsWith("zh") ? "\u641C\u7D22\u6A21\u578B\u540D\u79F0\u3001\u63D0\u4F9B\u5546\u6216\u6A21\u578B ID" : "Search name, provider, or model ID";
    input.setAttribute("aria-label", input.placeholder);
    input.style.cssText = "box-sizing:border-box;width:100%;border:1px solid currentColor;border-radius:8px;padding:7px 9px;background:transparent;color:inherit;font:inherit";
    native.parentNode.insertBefore(input, native);
    native.value = "";
    native.dispatchEvent(new document.defaultView.Event("input", { bubbles: true }));
    native.hidden = true;
    const empty = document.createElement("div");
    empty.dataset.dshModelSearch = "model-command-empty";
    empty.textContent = locale.startsWith("zh") ? "\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B" : "No matching models";
    empty.style.cssText = "padding:12px;opacity:.7;text-align:center";
    empty.hidden = true;
    const listbox = card.querySelector('[role="listbox"]');
    listbox.parentNode.insertBefore(empty, listbox.nextSibling);
    let visible = entries;
    let activeIndex = -1;
    const controlId = ++controlSequence2;
    const assignedIds = /* @__PURE__ */ new Set();
    const activate = (entry, index) => {
      if (!entry.row.id) {
        entry.row.id = `dsh-model-search-command-${controlId}-${index}`;
        assignedIds.add(entry.row);
      }
      input.setAttribute("aria-activedescendant", entry.row.id);
      entry.row.scrollIntoView?.({ block: "nearest" });
    };
    const applyFilter = () => {
      visible = [];
      for (const entry of entries) {
        const match = modelMatches(entry.group, entry.model, input.value);
        entry.row.hidden = !match;
        if (match) visible.push(entry);
      }
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
      empty.hidden = visible.length !== 0;
    };
    const onInput = () => applyFilter();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && input.value) {
        event.preventDefault();
        event.stopPropagation();
        input.value = "";
        applyFilter();
        return;
      }
      const handled = event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter";
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      if (!visible.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeIndex = activeIndex < 0 ? direction > 0 ? 0 : visible.length - 1 : (activeIndex + direction + visible.length) % visible.length;
        activate(visible[activeIndex], activeIndex);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        visible[activeIndex].row.click();
      }
    };
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown);
    const control = {
      input,
      destroy() {
        input.removeEventListener("input", onInput);
        input.removeEventListener("keydown", onKeyDown);
        for (const entry of entries) entry.row.hidden = false;
        for (const row of assignedIds) row.removeAttribute("id");
        native.hidden = false;
        empty.remove();
        input.remove();
        controllers2.delete(card);
      }
    };
    controllers2.set(card, control);
    input.focus();
    return control;
  }

  // lib/runtime.js
  function startModelSearch({
    document,
    MutationObserver = document?.defaultView?.MutationObserver,
    sessions,
    modelDirectories,
    onWarning = console.warn
  }) {
    const controls = /* @__PURE__ */ new Set();
    let snapshot = null;
    let scheduled = false;
    let observer;
    const cleanupDetached = () => {
      for (const control of controls) {
        if (!control.input?.isConnected) controls.delete(control);
      }
    };
    const scan = () => {
      scheduled = false;
      cleanupDetached();
      if (!snapshot?.groups?.length) return;
      const locale = (document.documentElement?.lang || "en").toLowerCase();
      for (const menu of document.querySelectorAll('[role="menu"]')) {
        if (!isComposerModelMenu(menu) || !menu.querySelector('button[role="menuitemradio"]')) continue;
        const control = decorateComposerMenu(menu, snapshot.groups, { locale, onWarning });
        if (control) controls.add(control);
      }
      for (const listbox of document.querySelectorAll('[role="listbox"]')) {
        if (!/\/model\b/i.test(listbox.getAttribute("aria-label") ?? "")) continue;
        const card = listbox.parentElement;
        if (!card || !isModelCommandPopup(card)) continue;
        const control = decorateModelCommand(card, snapshot, { locale, onWarning });
        if (control) controls.add(control);
      }
    };
    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(scan);
    };
    if (!document || typeof MutationObserver !== "function" || !sessions?.list || !modelDirectories) {
      onWarning("dsh-model-search: required browser or model-directory capability is unavailable; enhancement disabled");
      return { stop() {
      } };
    }
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const unbind = bindCurrentDirectory({
      sessions,
      modelDirectories,
      onWarning,
      onSnapshot(next) {
        if (snapshot !== next) {
          for (const control of controls) control.destroy();
          controls.clear();
        }
        snapshot = next;
        scheduleScan();
      }
    });
    scheduleScan();
    return {
      stop() {
        observer?.disconnect();
        unbind();
        for (const control of controls) control.destroy();
        controls.clear();
      }
    };
  }

  // src/client-entry.js
  var inject = ["sessions"];
  function apply(ctx, environment = {}) {
    ctx.inject(["modelDirectories"], (scope) => {
      scope.effect(() => {
        const runtime = startModelSearch({
          document: environment.document ?? globalThis.document,
          MutationObserver: environment.MutationObserver ?? globalThis.MutationObserver,
          sessions: scope.sessions,
          modelDirectories: scope.modelDirectories
        });
        return () => runtime.stop();
      }, "dsh-model-search: DOM observer");
    });
  }
  return __toCommonJS(client_entry_exports);
})();
return { apply: DSHModelSearch.apply, inject: DSHModelSearch.inject }; } });
