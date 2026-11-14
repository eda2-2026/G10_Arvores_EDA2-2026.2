import assert from "node:assert/strict";
import test from "node:test";

import { AVLTree } from "../../src/structures/avl-tree.js";

function validateAVL(tree) {
  function visit(node, lowerBound, upperBound) {
    if (node === null) {
      return { count: 0, height: 0 };
    }

    if (lowerBound !== undefined) {
      assert.ok(tree.compare(node.key, lowerBound) > 0);
    }

    if (upperBound !== undefined) {
      assert.ok(tree.compare(node.key, upperBound) < 0);
    }

    const left = visit(node.left, lowerBound, node.key);
    const right = visit(node.right, node.key, upperBound);
    const expectedHeight = 1 + Math.max(left.height, right.height);
    const balanceFactor = left.height - right.height;

    assert.equal(node.height, expectedHeight);
    assert.ok(
      balanceFactor >= -1 && balanceFactor <= 1,
      `Fator de balanceamento inválido na chave ${node.key}: ${balanceFactor}`,
    );

    return {
      count: 1 + left.count + right.count,
      height: expectedHeight,
    };
  }

  const result = visit(tree.root, undefined, undefined);
  assert.equal(result.count, tree.size);
}

function insertEntries(tree, entries) {
  for (const [key, value] of entries) {
    tree.insert(key, value);
  }
}

function shuffledRange(size, seed) {
  const values = Array.from({ length: size }, (_, index) => index + 1);
  let state = seed >>> 0;

  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (1_664_525 * state + 1_013_904_223) >>> 0;
    const target = state % (index + 1);
    [values[index], values[target]] = [values[target], values[index]];
  }

  return values;
}

test("representa uma árvore vazia", () => {
  const tree = new AVLTree();

  assert.equal(tree.size, 0);
  assert.equal(tree.get(10), undefined);
  assert.equal(tree.remove(10), false);
  assert.equal(tree.min(), null);
  assert.equal(tree.max(), null);
  assert.deepEqual(tree.inOrder(), []);
  validateAVL(tree);
});

test("insere e consulta um elemento", () => {
  const tree = new AVLTree();

  tree.insert(10, "dez");

  assert.equal(tree.size, 1);
  assert.equal(tree.get(10), "dez");
  assert.deepEqual(tree.min(), { key: 10, value: "dez" });
  assert.deepEqual(tree.max(), { key: 10, value: "dez" });
  assert.equal(tree.root.height, 1);
  validateAVL(tree);
});

test("insere vários elementos e encontra chaves existentes", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [40, "quarenta"],
    [20, "vinte"],
    [60, "sessenta"],
    [10, "dez"],
    [30, "trinta"],
    [50, "cinquenta"],
    [70, "setenta"],
  ]);

  assert.equal(tree.size, 7);
  assert.equal(tree.get(30), "trinta");
  assert.equal(tree.get(70), "setenta");
  assert.equal(tree.get(99), undefined);
  validateAVL(tree);
});

test("rejeita chaves duplicadas sem alterar o valor ou o tamanho", () => {
  const tree = new AVLTree();
  tree.insert(10, "original");

  assert.throws(() => tree.insert(10, "substituto"), /duplicate key/i);
  assert.equal(tree.get(10), "original");
  assert.equal(tree.size, 1);
  validateAVL(tree);
});

test("realiza rotação LL", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [30, "trinta"],
    [20, "vinte"],
    [10, "dez"],
  ]);

  assert.equal(tree.root.key, 20);
  assert.equal(tree.root.left.key, 10);
  assert.equal(tree.root.right.key, 30);
  validateAVL(tree);
});

test("realiza rotação RR", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [10, "dez"],
    [20, "vinte"],
    [30, "trinta"],
  ]);

  assert.equal(tree.root.key, 20);
  assert.equal(tree.root.left.key, 10);
  assert.equal(tree.root.right.key, 30);
  validateAVL(tree);
});

test("realiza rotação LR", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [30, "trinta"],
    [10, "dez"],
    [20, "vinte"],
  ]);

  assert.equal(tree.root.key, 20);
  assert.equal(tree.root.left.key, 10);
  assert.equal(tree.root.right.key, 30);
  validateAVL(tree);
});

test("realiza rotação RL", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [10, "dez"],
    [30, "trinta"],
    [20, "vinte"],
  ]);

  assert.equal(tree.root.key, 20);
  assert.equal(tree.root.left.key, 10);
  assert.equal(tree.root.right.key, 30);
  validateAVL(tree);
});

test("remove uma folha", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [20, "vinte"],
    [10, "dez"],
    [30, "trinta"],
  ]);

  assert.equal(tree.remove(10), true);
  assert.equal(tree.get(10), undefined);
  assert.equal(tree.size, 2);
  validateAVL(tree);
});

test("remove um nó com um filho", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [20, "vinte"],
    [10, "dez"],
    [30, "trinta"],
    [5, "cinco"],
  ]);

  assert.equal(tree.remove(10), true);
  assert.equal(tree.get(10), undefined);
  assert.equal(tree.get(5), "cinco");
  assert.equal(tree.size, 3);
  validateAVL(tree);
});

test("remove um nó com dois filhos", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [20, "vinte"],
    [10, "dez"],
    [30, "trinta"],
    [25, "vinte e cinco"],
    [40, "quarenta"],
  ]);

  assert.equal(tree.remove(30), true);
  assert.equal(tree.get(30), undefined);
  assert.equal(tree.get(25), "vinte e cinco");
  assert.equal(tree.get(40), "quarenta");
  assert.equal(tree.size, 4);
  validateAVL(tree);
});

test("remove a raiz e mantém a árvore válida", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [20, "vinte"],
    [10, "dez"],
    [30, "trinta"],
  ]);

  assert.equal(tree.remove(20), true);
  assert.equal(tree.get(20), undefined);
  assert.equal(tree.size, 2);
  validateAVL(tree);
});

test("retorna false ao remover uma chave inexistente", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [10, "dez"],
    [20, "vinte"],
  ]);

  assert.equal(tree.remove(99), false);
  assert.equal(tree.size, 2);
  assert.deepEqual(tree.inOrder(), [
    { key: 10, value: "dez" },
    { key: 20, value: "vinte" },
  ]);
  validateAVL(tree);
});

test("retorna mínimo, máximo e percurso em ordem", () => {
  const tree = new AVLTree();
  insertEntries(tree, [
    [40, "d"],
    [10, "a"],
    [30, "c"],
    [20, "b"],
  ]);

  assert.deepEqual(tree.min(), { key: 10, value: "a" });
  assert.deepEqual(tree.max(), { key: 40, value: "d" });
  assert.deepEqual(tree.inOrder(), [
    { key: 10, value: "a" },
    { key: 20, value: "b" },
    { key: 30, value: "c" },
    { key: 40, value: "d" },
  ]);
  validateAVL(tree);
});

test("atualiza size após inserções e remoções", () => {
  const tree = new AVLTree();

  tree.insert(2, "dois");
  tree.insert(1, "um");
  tree.insert(3, "três");
  assert.equal(tree.size, 3);

  assert.equal(tree.remove(2), true);
  assert.equal(tree.size, 2);
  assert.equal(tree.remove(2), false);
  assert.equal(tree.size, 2);

  assert.equal(tree.remove(1), true);
  assert.equal(tree.remove(3), true);
  assert.equal(tree.size, 0);
  assert.equal(tree.root, null);
  validateAVL(tree);
});

test("preserva os valores após rotações e remoções", () => {
  const tree = new AVLTree();
  const entries = [
    [50, { label: "A" }],
    [30, { label: "B" }],
    [70, { label: "C" }],
    [60, { label: "D" }],
    [80, { label: "E" }],
    [55, { label: "F" }],
    [65, { label: "G" }],
  ];
  insertEntries(tree, entries);

  assert.equal(tree.remove(50), true);

  for (const [key, value] of entries) {
    assert.equal(tree.get(key), key === 50 ? undefined : value);
  }

  validateAVL(tree);
});

test("aceita um comparador personalizado", () => {
  const tree = new AVLTree((first, second) => first.localeCompare(second));
  insertEntries(tree, [
    ["gamma", 3],
    ["alpha", 1],
    ["beta", 2],
  ]);

  assert.deepEqual(tree.inOrder(), [
    { key: "alpha", value: 1 },
    { key: "beta", value: 2 },
    { key: "gamma", value: 3 },
  ]);
  assert.equal(tree.get("beta"), 2);
  validateAVL(tree);
});

test("mantém as invariantes em uma sequência crescente", () => {
  const tree = new AVLTree();

  for (let key = 1; key <= 200; key += 1) {
    tree.insert(key, `valor-${key}`);
    validateAVL(tree);
  }

  for (let key = 1; key <= 200; key += 2) {
    assert.equal(tree.remove(key), true);
    validateAVL(tree);
  }

  assert.deepEqual(
    tree.inOrder().map(({ key }) => key),
    Array.from({ length: 100 }, (_, index) => (index + 1) * 2),
  );
});

test("mantém as invariantes em uma sequência decrescente", () => {
  const tree = new AVLTree();

  for (let key = 200; key >= 1; key -= 1) {
    tree.insert(key, `valor-${key}`);
    validateAVL(tree);
  }

  for (let key = 200; key >= 1; key -= 2) {
    assert.equal(tree.remove(key), true);
    validateAVL(tree);
  }

  assert.deepEqual(
    tree.inOrder().map(({ key }) => key),
    Array.from({ length: 100 }, (_, index) => index * 2 + 1),
  );
});

test("mantém as invariantes em sequências pseudoaleatórias determinísticas", () => {
  const tree = new AVLTree();
  const insertionOrder = shuffledRange(300, 2_026);
  const removalOrder = shuffledRange(300, 42);

  for (const key of insertionOrder) {
    tree.insert(key, `valor-${key}`);
    validateAVL(tree);
  }

  for (const key of removalOrder) {
    assert.equal(tree.remove(key), true);
    validateAVL(tree);
  }

  assert.equal(tree.size, 0);
  assert.equal(tree.root, null);
});
