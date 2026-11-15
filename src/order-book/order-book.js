import { AVLTree } from "../structures/avl-tree.js";
import { Order, SIDES, assertPositiveInteger, assertSide } from "../models/order.js";
import { PriceLevel } from "../models/price-level.js";

/** Livro de ofertas em memória para um único ativo fictício. */
export class OrderBook {
  #ordersById = new Map();
  #trades = [];
  #nextId = 1;
  #nextSequence = 1;
  #nextTradeId = 1;

  constructor() {
    this.bids = new AVLTree();
    this.asks = new AVLTree();
  }

  /** Registra uma ordem limitada e executa contra as melhores ordens opostas. */
  addOrder(side, price, quantity) {
    assertSide(side);
    assertPositiveInteger(price, "Price");
    assertPositiveInteger(quantity, "Quantity");

    if (!Number.isSafeInteger(this.#nextId) || !Number.isSafeInteger(this.#nextSequence)) {
      throw new RangeError("Order identifiers have been exhausted.");
    }

    const order = new Order({
      id: this.#nextId,
      side,
      price,
      quantity,
      sequence: this.#nextSequence,
    });

    this.#matchOrder(order);

    if (!order.isFilled) {
      const tree = this.#treeFor(side);
      let level = tree.get(price);
      if (level === undefined) {
        level = new PriceLevel(side, price);
        const node = level.add(order);
        tree.insert(price, level);
        this.#ordersById.set(order.id, { order, level, node });
      } else {
        const node = level.add(order);
        this.#ordersById.set(order.id, { order, level, node });
      }
    }

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

    this.#removeActiveOrder(entry);
    return true;
  }

  /** Retorna uma representação da ordem pendente, ou null. */
  getOrder(id) {
    const entry = this.#ordersById.get(id);
    return entry === undefined ? null : this.#orderView(entry.order);
  }

  /** Histórico em ordem de execução, com registros copiados. */
  getTrades() {
    return this.#trades.map((trade) => ({ ...trade }));
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

  #matchOrder(incoming) {
    const opposite = incoming.isBuy ? this.asks : this.bids;

    while (!incoming.isFilled) {
      const best = incoming.isBuy ? opposite.min() : opposite.max();
      if (best === null || (incoming.isBuy
        ? incoming.price < best.key : incoming.price > best.key)) {
        break;
      }

      const resting = best.value.peek();
      const quantity = Math.min(incoming.remaining, resting.remaining);
      incoming.remaining -= quantity;
      resting.remaining -= quantity;

      this.#trades.push({
        id: this.#nextTradeId,
        buyOrderId: incoming.isBuy ? incoming.id : resting.id,
        sellOrderId: incoming.isBuy ? resting.id : incoming.id,
        price: resting.price,
        quantity,
      });
      this.#nextTradeId += 1;

      if (resting.isFilled) {
        this.#removeActiveOrder(this.#ordersById.get(resting.id));
      }
    }
  }

  #removeActiveOrder({ order, level, node }) {
    level.remove(node);
    this.#ordersById.delete(order.id);
    if (level.isEmpty) {
      this.#treeFor(order.side).remove(order.price);
    }
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
