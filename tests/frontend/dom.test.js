import assert from "node:assert/strict";
import { test } from "node:test";

import { escapeHtml, html, raw } from "../../lib/dom.js";

test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`<img src="x" onerror='y'>&`), "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(3), "3");
});

test("html escapes interpolated values", () => {
  const name = "<script>alert(1)</script>";
  assert.equal(String(html`<p>${name}</p>`), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("html keeps nested html and raw markup", () => {
  const inner = html`<b>${"a & b"}</b>`;
  assert.equal(String(html`<p>${inner}${raw("<br>")}</p>`), "<p><b>a &amp; b</b><br></p>");
});

test("html joins arrays and skips false, null and undefined", () => {
  const items = ["x", "<y>"].map((item) => html`<li>${item}</li>`);
  assert.equal(String(html`<ul>${items}</ul>`), "<ul><li>x</li><li>&lt;y&gt;</li></ul>");
  assert.equal(String(html`${false}${null}${undefined}${0}`), "0");
});
