import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("legacy experiment route keeps paid traffic attribution at the edge", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /url\.pathname === "\/experimentar"/);
  assert.match(worker, /new URL\("\/app", url\)/);
  assert.match(worker, /destination\.searchParams\.set\("guest", "1"\)/);
  for (const parameter of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    assert.match(worker, new RegExp(parameter));
  }
});
