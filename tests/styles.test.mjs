import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "src/styles/global.css");
const compiled = readFile(source, "utf8").then(async (css) => {
  const result = await postcss([tailwindcss({ base: root, optimize: true })])
    .process(css, { from: source });
  return postcss.parse(result.css);
});

function declarations(css, selector, property) {
  const values = [];
  css.walkRules((rule) => {
    if (selector(rule.selector)) {
      rule.walkDecls(property, (declaration) => values.push(declaration.value));
    }
  });
  return values;
}

test("compiled theme retains class-based dark mode and the site palette", async () => {
  const css = await compiled;
  assert.deepEqual(declarations(css, (s) => s === "html", "background-color"), ["#f8f8f6"]);
  assert.deepEqual(declarations(css, (s) => s === "html.dark", "background-color"), ["#171412"]);
  assert.ok(declarations(css, (s) => s.includes(".paper") && s.includes(".dark"), "background-color").length);
  css.walkAtRules("media", (rule) => assert.ok(!rule.params.includes("prefers-color-scheme")));
});

test("compiled typography retains reading width, headings and anchor hover", async () => {
  const css = await compiled;
  assert.equal(declarations(css, (s) => s === ".prose-shell", "max-width").at(-1), "72ch");
  assert.ok(declarations(css, (s) => s.startsWith(".prose-shell ") && s.includes(":where(h1,"), "font-family")
    .some((value) => value.includes("Source Serif 4")));
  assert.ok(declarations(css, (s) => s.startsWith(".prose-shell ") && s.includes(":where(a)") && s.endsWith(":hover"), "color")
    .includes("#326c61"));
  assert.ok(declarations(css, (s) => s.includes(".prose-shell") && s.includes(".dark") && s.includes(":where(h1,"), "color").length);
});

test("compiled card blur, inline code radius and responsive layout remain available", async () => {
  const css = await compiled;
  const tokens = new Map();
  css.walkDecls((declaration) => tokens.set(declaration.prop, declaration.value));
  assert.equal(tokens.get("--blur-sm"), "8px");
  assert.equal(tokens.get("--radius-sm"), ".25rem");
  assert.ok(declarations(css, (s) => s === ".paper", "--tw-backdrop-blur").includes("blur(var(--blur-sm))"));
  assert.ok(declarations(css, (s) => s.includes(".prose-shell") && s.includes(":where(code)"), "border-radius")
    .includes("var(--radius-sm)"));
  assert.ok(declarations(css, (s) => s.startsWith(".lg\\:grid-cols-"), "grid-template-columns").length);
});

test("caller hover colors outrank card and tag defaults in both themes", async () => {
  const css = await compiled;
  function layer(rule) {
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === "atrule" && parent.name === "layer") return parent.params;
    }
    return null;
  }
  const order = [...new Set(css.nodes
    .filter((node) => node.type === "atrule" && node.name === "layer")
    .flatMap((node) => node.params.split(",").map((name) => name.trim())))];
  assert.ok(order.includes("components") && order.includes("utilities"));
  assert.ok(order.indexOf("components") < order.indexOf("utilities"));
  let defaults = 0;
  let hoverColors = 0;
  css.walkRules((rule) => {
    if (/\.(paper|tag-chip)(?![\w-])/.test(rule.selector)) {
      rule.walkDecls(/^(color|border-color)$/, () => {
        assert.equal(layer(rule), "components", rule.selector);
        defaults++;
      });
    }
    if (rule.selector.includes(":hover") && /hover\\:(border|text)-accent-/.test(rule.selector)) {
      rule.walkDecls(/^(color|border-color)$/, () => {
        assert.equal(layer(rule), "utilities", rule.selector);
        hoverColors++;
      });
    }
  });
  assert.ok(defaults >= 4);
  assert.ok(hoverColors >= 3);
});
