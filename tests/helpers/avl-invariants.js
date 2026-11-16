import assert from "node:assert/strict";

export function assertValidAVL(tree, label = "árvore") {
  function visit(node, lowerBound, upperBound) {
    if (node === null) {
      return { count: 0, height: 0 };
    }

    if (lowerBound !== undefined) {
      assert.ok(tree.compare(node.key, lowerBound) > 0, `${label}: chave ${node.key} fora da ordem`);
    }

    if (upperBound !== undefined) {
      assert.ok(tree.compare(node.key, upperBound) < 0, `${label}: chave ${node.key} fora da ordem`);
    }

    const left = visit(node.left, lowerBound, node.key);
    const right = visit(node.right, node.key, upperBound);
    const height = 1 + Math.max(left.height, right.height);
    const balance = left.height - right.height;

    assert.equal(node.height, height, `${label}: altura errada na chave ${node.key}`);
    assert.ok(Math.abs(balance) <= 1, `${label}: fator de balanceamento ${balance} na chave ${node.key}`);

    return { count: 1 + left.count + right.count, height };
  }

  const result = visit(tree.root, undefined, undefined);
  assert.equal(result.count, tree.size, `${label}: size não confere com a quantidade de nós`);

  return result;
}

export function createRandom(seed) {
  let state = seed >>> 0;

  return function nextInt(maxExclusive) {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    const unit = ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;

    return Math.floor(unit * maxExclusive);
  };
}
