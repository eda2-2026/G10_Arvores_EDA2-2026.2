import { assertPositiveInteger, assertSide, Order } from "./order.js";
import { OrderQueue } from "../structures/order-queue.js";

/**
 * Nível de preço: todas as ordens de um mesmo lado com o mesmo preço.
 *
 * É o valor guardado em cada nó da AVL (a chave do nó é o preço). As ordens
 * ficam em uma fila FIFO, então a mais antiga é sempre a próxima a negociar.
 */
export class PriceLevel {
  #queue = new OrderQueue();

  constructor(side, price) {
    assertSide(side);
    assertPositiveInteger(price, "Price");

    this.side = side;
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
    if (!(order instanceof Order)) {
      throw new TypeError("Price level only accepts Order instances.");
    }

    if (order.side !== this.side) {
      throw new Error(`Order side "${order.side}" does not match level side "${this.side}".`);
    }

    if (order.price !== this.price) {
      throw new Error(`Order price ${order.price} does not match level price ${this.price}.`);
    }

    if (order.isFilled) {
      throw new Error("Filled orders cannot be added to a price level.");
    }

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
