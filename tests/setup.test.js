import assert from "node:assert/strict";
import test from "node:test";

test("executa com Node.js 20 ou superior e módulos ES", () => {
  const majorVersion = Number.parseInt(process.versions.node, 10);

  assert.ok(majorVersion >= 20);
  assert.match(import.meta.url, /^file:/);
});
