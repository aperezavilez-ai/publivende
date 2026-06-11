import { useRef, useSyncExternalStore } from "react";
import { getDBVersion, loadDB } from "./db";
import type { DB } from "./types";

function subscribe(cb: () => void) {
  window.addEventListener("publivende-db-change", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("publivende-db-change", cb);
    window.removeEventListener("storage", cb);
  };
}

export function useDB<T>(selector: (db: DB) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cacheRef = useRef<{ version: number; result: T } | undefined>(undefined);

  return useSyncExternalStore(
    subscribe,
    () => {
      const version = getDBVersion();
      if (cacheRef.current?.version === version) return cacheRef.current.result;
      const result = selectorRef.current(loadDB());
      cacheRef.current = { version, result };
      return result;
    },
    () => selectorRef.current(loadDB()),
  );
}
