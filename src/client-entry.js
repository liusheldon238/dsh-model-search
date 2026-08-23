import { startModelSearch } from "../lib/runtime.js";

export const inject = ["sessions"];

export function apply(ctx, environment = {}) {
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
