import { OrderQueue } from "../structures/order-queue.js";

/**
 * Nível de preço: todas as ordens de um mesmo lado com o mesmo preço.
 *
 * É o valor guardado em cada nó da AVL (a chave do nó é o preço). As ordens
 * ficam em uma fila FIFO, então a mais antiga é sempre a próxima a negociar.
 */
export class PriceLevel {
  #queue = new OrderQueue();

  constructor(price) {
    this.price = price;
  }

  get orderCount() {
    return this.#queue.size;
  }

  get isEmpty() {
    return this.#queue.isEmpty;
  }

  get totalQuantity() {
    let total = 0;

    for (const order of this.#queue.toArray()) {
      total += order.remaining;
    }

    return total;
  }

  add(order) {
    return this.#queue.enqueue(order);
  }

  remove(node) {
    return this.#queue.remove(node);
  }

  peek() {
    return this.#queue.peek();
  }

  orders() {
    return this.#queue.toArray();
  }
}
