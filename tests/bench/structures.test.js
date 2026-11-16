import assert from "node:assert/strict";
import test from "node:test";

import { STRUCTURES } from "../../bench/structures.js";
import { createRandom } from "../helpers/avl-invariants.js";

for (const [key, structure] of Object.entries(STRUCTURES)) {
  test(`${structure.label} do benchmark se comporta como um Map ordenado`, () => {
    const random = createRandom(key.length * 101);
    const subject = structure.create();
    const expected = new Map();

    for (let step = 0; step < 4_000; step += 1) {
      const value = 1 + random(500);

      if (random(3) === 0) {
        assert.equal(subject.remove(value), expected.delete(value), `${structure.label}: remoção de ${value}`);
      } else if (expected.has(value)) {
        assert.throws(() => subject.insert(value, value), /Duplicate key/);
      } else {
        subject.insert(value, `v${value}`);
        expected.set(value, `v${value}`);
      }

      assert.equal(subject.size, expected.size);
      assert.equal(subject.get(value), expected.get(value));
    }

    const largest = Math.max(...expected.keys());
    assert.deepEqual(subject.max(), { key: largest, value: `v${largest}` });
  });
}

test("ABB sem balanceamento degenera em lista com chaves crescentes e a AVL não", () => {
  const bst = STRUCTURES.bst.create();
  const avl = STRUCTURES.avl.create();

  for (let key = 1; key <= 1_000; key += 1) {
    bst.insert(key, key);
    avl.insert(key, key);
  }

  assert.equal(STRUCTURES.bst.height(bst), 1_000);
  assert.equal(STRUCTURES.avl.height(avl), 10);
});
