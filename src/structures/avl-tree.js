import { AVLNode } from "./avl-node.js";

const numericCompare = (first, second) => first - second;

export class AVLTree {
  constructor(compare = numericCompare) {
    if (typeof compare !== "function") {
      throw new TypeError("Comparator must be a function.");
    }

    this.compare = compare;
    this.root = null;
    this._size = 0;
  }

  get size() {
    return this._size;
  }

  insert(key, value) {
    this.root = this.#insertNode(this.root, key, value);
    this._size += 1;
  }

  get(key) {
    let current = this.root;

    while (current !== null) {
      const comparison = this.compare(key, current.key);

      if (comparison === 0) {
        return current.value;
      }

      current = comparison < 0 ? current.left : current.right;
    }

    return undefined;
  }

  remove(key) {
    const result = { removed: false };
    this.root = this.#removeNode(this.root, key, result);

    if (result.removed) {
      this._size -= 1;
    }

    return result.removed;
  }

  min() {
    if (this.root === null) {
      return null;
    }

    const node = this.#minimumNode(this.root);
    return { key: node.key, value: node.value };
  }

  max() {
    if (this.root === null) {
      return null;
    }

    let current = this.root;

    while (current.right !== null) {
      current = current.right;
    }

    return { key: current.key, value: current.value };
  }

  inOrder() {
    const entries = [];
    this.#appendInOrder(this.root, entries);
    return entries;
  }

  #insertNode(node, key, value) {
    if (node === null) {
      return new AVLNode(key, value);
    }

    const comparison = this.compare(key, node.key);

    if (comparison === 0) {
      throw new Error("Duplicate key.");
    }

    if (comparison < 0) {
      node.left = this.#insertNode(node.left, key, value);
    } else {
      node.right = this.#insertNode(node.right, key, value);
    }

    return this.#rebalance(node);
  }

  #removeNode(node, key, result) {
    if (node === null) {
      return null;
    }

    const comparison = this.compare(key, node.key);

    if (comparison < 0) {
      node.left = this.#removeNode(node.left, key, result);
    } else if (comparison > 0) {
      node.right = this.#removeNode(node.right, key, result);
    } else {
      result.removed = true;

      if (node.left === null) {
        return node.right;
      }

      if (node.right === null) {
        return node.left;
      }

      const successor = this.#minimumNode(node.right);
      node.key = successor.key;
      node.value = successor.value;
      node.right = this.#removeNode(node.right, successor.key, result);
    }

    return this.#rebalance(node);
  }

  #minimumNode(node) {
    let current = node;

    while (current.left !== null) {
      current = current.left;
    }

    return current;
  }

  #appendInOrder(node, entries) {
    if (node === null) {
      return;
    }

    this.#appendInOrder(node.left, entries);
    entries.push({ key: node.key, value: node.value });
    this.#appendInOrder(node.right, entries);
  }

  #height(node) {
    return node === null ? 0 : node.height;
  }

  #updateHeight(node) {
    node.height = 1 + Math.max(this.#height(node.left), this.#height(node.right));
  }

  #balanceFactor(node) {
    return this.#height(node.left) - this.#height(node.right);
  }

  #rebalance(node) {
    this.#updateHeight(node);
    const balance = this.#balanceFactor(node);

    if (balance > 1) {
      if (this.#balanceFactor(node.left) < 0) {
        node.left = this.#rotateLeft(node.left);
      }

      return this.#rotateRight(node);
    }

    if (balance < -1) {
      if (this.#balanceFactor(node.right) > 0) {
        node.right = this.#rotateRight(node.right);
      }

      return this.#rotateLeft(node);
    }

    return node;
  }

  #rotateLeft(node) {
    const newRoot = node.right;
    const transferredSubtree = newRoot.left;

    newRoot.left = node;
    node.right = transferredSubtree;

    this.#updateHeight(node);
    this.#updateHeight(newRoot);

    return newRoot;
  }

  #rotateRight(node) {
    const newRoot = node.left;
    const transferredSubtree = newRoot.right;

    newRoot.right = node;
    node.left = transferredSubtree;

    this.#updateHeight(node);
    this.#updateHeight(newRoot);

    return newRoot;
  }
}
