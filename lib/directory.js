function currentSessionId(sessions) {
  const current = sessions?.list?.getSnapshot?.()?.current;
  if (typeof current === "string") return current;
  return current?.sessionId ?? current?.id;
}

export function bindCurrentDirectory({ sessions, modelDirectories, onSnapshot, onWarning = () => {} }) {
  let stopped = false;
  let sessionId;
  let unsubscribeDirectory = () => {};

  const publish = (value) => {
    if (!stopped) onSnapshot?.(value);
  };

  const rebind = () => {
    const nextId = currentSessionId(sessions);
    if (nextId === sessionId) return;
    sessionId = nextId;
    unsubscribeDirectory();
    unsubscribeDirectory = () => {};

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

  const unsubscribeSessions = sessions?.list?.subscribe?.(rebind) ?? (() => {});
  rebind();

  return () => {
    if (stopped) return;
    stopped = true;
    unsubscribeSessions();
    unsubscribeDirectory();
  };
}
