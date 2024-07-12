import { ComponentType } from "react";

type LazyComponentModule<T> = { default: T };

/**
 * This function is used to fake the import of a component for React.lazy.
 * The only difference between this and a normal import is that this function
 * returns a promise that never resolves.
 * This is used for testing the appearance of the fallback UI of React.Suspense.
 * @param path
 * @returns
 */
export function fakeImport<T = ComponentType<any>>(
  path: string,
  reject: boolean = false
): Promise<LazyComponentModule<T>> {
  if (reject) {
    return Promise.reject(new Error("Failed to load component"));
  }
  return new Promise<LazyComponentModule<T>>(() => {});
}
