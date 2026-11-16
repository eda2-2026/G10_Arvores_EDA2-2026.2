import { AVLTree } from "../src/structures/avl-tree.js";

class BSTNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

export class UnbalancedBST {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  insert(key, value) {
    const node = new BSTNode(key, value);

    if (this.root === null) {
      this.root = node;
      this.size = 1;
      return;
    }

    let current = this.root;

    while (true) {
      if (key === current.key) {
        throw new Error("Duplicate key.");
      }

      const side = key < current.key ? "left" : "right";

      if (current[side] === null) {
        current[side] = node;
        this.size += 1;
        return;
      }

      current = current[side];
    }
  }

  get(key) {
    let current = this.root;

    while (current !== null && current.key !== key) {
      current = key < current.key ? current.left : current.right;
    }

    return current === null ? undefined : current.value;
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

  remove(key) {
    let parent = null;
    let current = this.root;

    while (current !== null && current.key !== key) {
      parent = current;
      current = key < current.key ? current.left : current.right;
    }

    if (current === null) {
      return false;
    }

    if (current.left !== null && current.right !== null) {
      let successorParent = current;
      let successor = current.right;

      while (successor.left !== null) {
        successorParent = successor;
        successor = successor.left;
      }

      current.key = successor.key;
      current.value = successor.value;
      parent = successorParent;
      current = successor;
    }

    const child = current.left !== null ? current.left : current.right;

    if (parent === null) {
      this.root = child;
    } else if (parent.left === current) {
      parent.left = child;
    } else {
      parent.right = child;
    }

    this.size -= 1;
    return true;
  }

  get height() {
    let height = 0;
    let level = this.root === null ? [] : [this.root];

    while (level.length > 0) {
      height += 1;
      const next = [];

      for (const node of level) {
        if (node.left !== null) {
          next.push(node.left);
        }

        if (node.right !== null) {
          next.push(node.right);
        }
      }

      level = next;
    }

    return height;
  }
}

export class SortedArrayMap {
  constructor() {
    this.keys = [];
    this.values = [];
  }

  get size() {
    return this.keys.length;
  }

  #lowerBound(key) {
    let low = 0;
    let high = this.keys.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (this.keys[middle] < key) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  }

  insert(key, value) {
    const index = this.#lowerBound(key);

    if (this.keys[index] === key) {
      throw new Error("Duplicate key.");
    }

    this.keys.splice(index, 0, key);
    this.values.splice(index, 0, value);
  }

  get(key) {
    const index = this.#lowerBound(key);
    return this.keys[index] === key ? this.values[index] : undefined;
  }

  max() {
    const last = this.keys.length - 1;
    return last < 0 ? null : { key: this.keys[last], value: this.values[last] };
  }

  remove(key) {
    const index = this.#lowerBound(key);

    if (this.keys[index] !== key) {
      return false;
    }

    this.keys.splice(index, 1);
    this.values.splice(index, 1);
    return true;
  }
}

export function avlHeight(tree) {
  return tree.root === null ? 0 : tree.root.height;
}

export const STRUCTURES = {
  avl: { label: "AVL", create: () => new AVLTree(), height: avlHeight },
  bst: { label: "ABB sem balanceamento", create: () => new UnbalancedBST(), height: (tree) => tree.height },
  array: { label: "Array ordenado", create: () => new SortedArrayMap(), height: () => null },
};
