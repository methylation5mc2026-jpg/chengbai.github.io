type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;

export function readPreference(
  key: string,
  getStorage: StorageAccess = () => window.localStorage
) {
  try {
    return getStorage().getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(
  key: string,
  value: string,
  getStorage: StorageAccess = () => window.localStorage
) {
  try {
    getStorage().setItem(key, value);
    return true;
  } catch {
    // The current page still works when persistence is blocked or full.
    return false;
  }
}

export function readerNumber(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function chapterUrl(href: string | undefined, base: string, currentHref: string) {
  if (!href) return undefined;
  try {
    const current = new URL(currentHref);
    const target = new URL(href, current);
    if (target.origin !== current.origin || !["http:", "https:"].includes(target.protocol)) {
      return undefined;
    }
    const basePath = `/${base.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\//, "/");
    if (!target.pathname.startsWith(basePath)) {
      target.pathname = `${basePath}${target.pathname.replace(/^\/+/, "")}`;
    }
    return target.href;
  } catch {
    return undefined;
  }
}
