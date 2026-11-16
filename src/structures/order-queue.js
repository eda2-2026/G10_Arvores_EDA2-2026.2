class QueueNode {
  constructor(order, queue) {
    this.order = order;
    this.queue = queue;
    this.previous = null;
    this.next = null;
  }
}

export class OrderQueue {
  #head = null;
  #tail = null;
  #size = 0;

  get size() {
    return this.#size;
  }

  get isEmpty() {
    return this.#size === 0;
  }

  enqueue(order) {
    const node = new QueueNode(order, this);

    if (this.#tail === null) {
      this.#head = node;
    } else {
      node.previous = this.#tail;
      this.#tail.next = node;
    }

    this.#tail = node;
    this.#size += 1;

    return node;
  }

  peek() {
    return this.#head === null ? null : this.#head.order;
  }

  dequeue() {
    if (this.#head === null) {
      return null;
    }

    return this.remove(this.#head);
  }

  remove(node) {
    if (node === null || typeof node !== "object" || node.queue !== this) {
      throw new Error("Node does not belong to this queue.");
    }

    if (node.previous === null) {
      this.#head = node.next;
    } else {
      node.previous.next = node.next;
    }

    if (node.next === null) {
      this.#tail = node.previous;
    } else {
      node.next.previous = node.previous;
    }

    node.previous = null;
    node.next = null;
    node.queue = null;
    this.#size -= 1;

    return node.order;
  }

  toArray() {
    const orders = [];

    for (let current = this.#head; current !== null; current = current.next) {
      orders.push(current.order);
    }

    return orders;
  }
}
