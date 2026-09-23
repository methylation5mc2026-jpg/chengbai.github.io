import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { chapterUrl, readPreference, readerNumber, writePreference } from "../src/lib/browser-preferences.ts";

test("blocked storage access and quota errors do not escape preference helpers", () => {
  const denied = () => { throw new Error("SecurityError"); };
  assert.equal(readPreference("theme", denied), null);
  assert.equal(writePreference("theme", "dark", denied), false);
  const full = () => ({ getItem: () => "light", setItem() { throw new Error("QuotaExceededError"); } });
  assert.equal(readPreference("theme", full), "light");
  assert.equal(writePreference("theme", "dark", full), false);
});

test("corrupt and extreme reader preferences cannot create invalid or unbounded CSS values", () => {
  for (const value of [null, "", " ", "NaN", "Infinity", "-Infinity", "1rem", "garbage"]) {
    assert.equal(readerNumber(value, 1.08, 0.96, 1.28), 1.08);
  }
  assert.equal(readerNumber("-100", 1.08, 0.96, 1.28), 0.96);
  assert.equal(readerNumber("100000", 74, 64, 86), 86);
  assert.equal(readerNumber("1.12", 1.08, 0.96, 1.28), 1.12);
});

const origin = "https://methylation5mc2026-jpg.github.io";
const base = "/chengbai.github.io";
const chapter = "/books/aivc-whitepaper/preface/";

test("chapter navigation preserves the GitHub Pages base exactly once", () => {
  const current = `${origin}${base}/books/aivc-whitepaper/chapter-01-aivc-introduction/`;
  assert.equal(chapterUrl(chapter, base, current), `${origin}${base}${chapter}`);
  assert.equal(chapterUrl(`${base}${chapter}`, `${base}/`, current), `${origin}${base}${chapter}`);
  assert.equal(chapterUrl(`${chapter}#overview`, base, current), `${origin}${base}${chapter}#overview`);
  assert.equal(chapterUrl(chapter, "/", `${origin}/`), `${origin}${chapter}`);
  for (const unsafe of [undefined, "javascript:alert(1)", "https://example.com/", "//example.com/"]) {
    assert.equal(chapterUrl(unsafe, base, current), undefined);
  }
});

function componentScript(name) {
  const source = readFileSync(new URL(`../src/components/${name}.astro`, import.meta.url), "utf8");
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, `Missing processed script in ${name}`);
  return stripTypeScriptTypes(script
    .replace(/^\s*import .+?;\s*$/gm, "")
    .replaceAll("import.meta.env.BASE_URL", JSON.stringify(base)));
}

test("theme button remains usable when browser storage is disabled", () => {
  const classes = new Set();
  const listeners = {};
  const attributes = {};
  const toggle = {
    setAttribute: (key, value) => { attributes[key] = value; },
    addEventListener: (key, callback) => { listeners[key] = callback; }
  };
  runInNewContext(componentScript("ThemeToggle"), {
    document: {
      documentElement: { classList: {
        add: key => classes.add(key),
        contains: key => classes.has(key),
        toggle: key => classes.has(key) ? classes.delete(key) : classes.add(key)
      } },
      querySelector: () => toggle
    },
    readPreference: key => readPreference(key, () => { throw new Error("SecurityError"); }),
    writePreference: (key, value) => writePreference(key, value, () => { throw new Error("SecurityError"); })
  });
  listeners.click();
  assert.equal(classes.has("dark"), true);
  assert.equal(attributes["aria-pressed"], "true");
  listeners.click();
  assert.equal(classes.has("dark"), false);
});

test("reader controls and progress work without storage; browser shortcuts and focused controls are preserved", () => {
  class FakeElement {
    closest() { return null; }
  }
  class FakeHTMLElement extends FakeElement {}
  const shell = { dataset: { prevChapter: chapter, nextChapter: chapter }, style: { setProperty(key, value) { this[key] = value; } } };
  const progress = { style: {} };
  const listeners = {};
  const windowListeners = {};
  const destinations = [];
  const denied = () => { throw new Error("SecurityError"); };
  runInNewContext(componentScript("BookReaderControls"), {
    Element: FakeElement,
    HTMLElement: FakeHTMLElement,
    document: {
      querySelector: selector => selector === "[data-reader-shell]" ? shell : progress,
      addEventListener: (key, callback) => { listeners[key] = callback; },
      documentElement: { scrollHeight: 1000 }
    },
    window: {
      innerHeight: 500,
      scrollY: 250,
      location: { href: `${origin}${base}/books/aivc-whitepaper/chapter-01/`, assign: href => destinations.push(href) },
      addEventListener: (key, callback) => { windowListeners[key] = callback; }
    },
    chapterUrl,
    readerNumber,
    readPreference: key => readPreference(key, denied),
    writePreference: (key, value) => writePreference(key, value, denied)
  });
  assert.equal(shell.style["--reader-size"], "1.08rem");
  assert.equal(progress.style.width, "50%");
  assert.equal(typeof windowListeners.scroll, "function");
  const fontButton = new FakeHTMLElement();
  fontButton.dataset = { readerFont: "plus" };
  fontButton.closest = selector => selector === "[data-reader-font]" ? fontButton : null;
  listeners.click({ target: fontButton });
  listeners.click({ target: fontButton });
  assert.equal(shell.style["--reader-size"], "1.16rem");
  const widthButton = new FakeHTMLElement();
  widthButton.dataset = { readerWidth: "wide" };
  widthButton.closest = selector => selector === "[data-reader-width]" ? widthButton : null;
  listeners.click({ target: widthButton });
  assert.equal(shell.style["--reader-width"], "86ch");
  const key = overrides => ({ key: "ArrowRight", target: new FakeElement(), preventDefault() { this.defaultPrevented = true; }, ...overrides });
  for (const flag of ["altKey", "ctrlKey", "metaKey", "shiftKey", "repeat", "defaultPrevented"]) {
    listeners.keydown(key({ [flag]: true }));
  }
  const focusedControl = new FakeElement();
  focusedControl.closest = () => focusedControl;
  listeners.keydown(key({ target: focusedControl }));
  assert.deepEqual(destinations, []);
  const plainArrow = key({});
  listeners.keydown(plainArrow);
  assert.deepEqual(destinations, [`${origin}${base}${chapter}`]);
  assert.equal(plainArrow.defaultPrevented, true);
});
