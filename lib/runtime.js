import { bindCurrentDirectory } from "./directory.js";
import { decorateComposerMenu, isComposerModelMenu } from "./composer.js";
import { decorateModelCommand, isModelCommandPopup } from "./model-command.js";

export function startModelSearch({
  document,
  MutationObserver = document?.defaultView?.MutationObserver,
  sessions,
  modelDirectories,
  onWarning = console.warn
}) {
  const controls = new Set();
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
    return { stop() {} };
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
