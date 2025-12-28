import type { StoreApi, UseBoundStore } from "zustand";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

/**
 * Creates auto-generated selector hooks for a Zustand store.
 * Usage: `const useStore = createSelectors(useStoreBase)`
 * Then: `const value = useStore.use.value()`
 */
export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {} as WithSelectors<typeof _store>["use"];

  for (const k of Object.keys(store.getState())) {
    (store.use as Record<string, () => unknown>)[k] = () =>
      store((s) => s[k as keyof typeof s]);
  }

  return store;
}
