import assert from "node:assert/strict";
import test from "node:test";

import { formatReais, parseReais } from "../../src/ui/money.js";

test("converte reais digitados para centavos", () => {
  assert.equal(parseReais("10"), 1000);
  assert.equal(parseReais("10,5"), 1050);
  assert.equal(parseReais("10,50"), 1050);
  assert.equal(parseReais("10.50"), 1050);
  assert.equal(parseReais(" 0,01 "), 1);
  assert.equal(parseReais("1234,99"), 123_499);
});

test("rejeita preços inválidos", () => {
  for (const text of ["", "abc", "0", "0,00", "-1", "10,505", "10,", ",50", "1.000,00", "1e3"]) {
    assert.equal(parseReais(text), null, `deveria rejeitar "${text}"`);
  }

  assert.equal(parseReais(1050), null);
  assert.equal(parseReais(undefined), null);
});

test("formata centavos como reais", () => {
  assert.equal(formatReais(1050), "10,50");
  assert.equal(formatReais(1000), "10,00");
  assert.equal(formatReais(5), "0,05");
  assert.equal(formatReais(123_499), "1234,99");
});
