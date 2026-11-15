import { AVLTree } from "../structures/avl-tree.js";
import { Order, SIDES, assertPositiveInteger, assertSide } from "../models/order.js";
import { PriceLevel } from "../models/price-level.js";

/** Livro de ofertas em memória para um único ativo fictício. */
export class OrderBook {
  #ordersById = new Map();
  #nextId = 1;
  #nextSequence = 1;

  constructor() {
    this.bids = new AVLTree();
    this.asks = new AVLTree();
  }

  /** Registra uma ordem limitada, sem tentar executá-la nesta etapa. */
  addOrder(side, price, quantity) {
    assertSide(side);
    assertPositiveInteger(price, "Price");
    assertPositiveInteger(quantity, "Quantity");

    if (!Number.isSafeInteger(this.#nextId) || !Number.isSafeInteger(this.#nextSequence)) {
      throw new RangeError("Order identifiers have been exhausted.");
    }

    const tree = this.#treeFor(side);
    let level = tree.get(price);
    const isNewLevel = level === undefined;

    if (isNewLevel) {
      level = new PriceLevel(side, price);
    }

    const order = new Order({
      id: this.#nextId,
      side,
      price,
      quantity,
      sequence: this.#nextSequence,
    });

    const node = level.add(order);

    if (isNewLevel) {
      tree.insert(price, level);
    }

    this.#ordersById.set(order.id, { order, level, node });
    this.#nextId += 1;
    this.#nextSequence += 1;
    return this.#orderView(order);
  }

  /** Retorna true se havia uma ordem pendente com o ID informado. */
  cancelOrder(id) {
    const entry = this.#ordersById.get(id);

    if (entry === undefined) {
      return false;
    }

    const { order, level, node } = entry;
    level.remove(node);
    this.#ordersById.delete(id);

    if (level.isEmpty) {
      this.#treeFor(order.side).remove(order.price);
    }

    return true;
  }

  /** Retorna uma representação da ordem pendente, ou null. */
  getOrder(id) {
    const entry = this.#ordersById.get(id);
    return entry === undefined ? null : this.#orderView(entry.order);
  }

  bestBid() {
    const entry = this.bids.max();
    return entry === null ? null : this.#levelView(entry.value);
  }

  bestAsk() {
    const entry = this.asks.min();
    return entry === null ? null : this.#levelView(entry.value);
  }

  listBids() {
    return this.bids.inOrder().reverse().map(({ value }) => this.#levelView(value));
  }

  listAsks() {
    return this.asks.inOrder().map(({ value }) => this.#levelView(value));
  }

  #treeFor(side) {
    return side === SIDES.BUY ? this.bids : this.asks;
  }

  #orderView(order) {
    return {
      id: order.id,
      side: order.side,
      price: order.price,
      quantity: order.quantity,
      remaining: order.remaining,
      sequence: order.sequence,
    };
  }

  #levelView(level) {
    return {
      price: level.price,
      totalQuantity: level.totalQuantity,
      orderCount: level.orderCount,
      orders: level.orders().map((order) => this.#orderView(order)),
    };
  }
}
