import assert from "node:assert/strict";
import test from "node:test";

import { SIDES } from "../../src/models/order.js";
import { OrderBook } from "../../src/order-book/order-book.js";
import { assertValidAVL, createRandom } from "../helpers/avl-invariants.js";

class ReferenceBook {
  constructor() {
    this.resting = [];
    this.trades = [];
    this.nextId = 1;
  }

  addOrder(side, price, quantity) {
    const order = { id: this.nextId, side, price, quantity, remaining: quantity, sequence: this.nextId };
    this.nextId += 1;

    const isBuy = side === SIDES.BUY;
    const candidates = this.resting
      .filter((resting) => resting.side !== side && (isBuy ? resting.price <= price : resting.price >= price))
      .sort((a, b) => (isBuy ? a.price - b.price : b.price - a.price) || a.sequence - b.sequence);

    for (const resting of candidates) {
      if (order.remaining === 0) {
        break;
      }

      const traded = Math.min(order.remaining, resting.remaining);
      order.remaining -= traded;
      resting.remaining -= traded;

      this.trades.push({
        id: this.trades.length + 1,
        buyOrderId: isBuy ? order.id : resting.id,
        sellOrderId: isBuy ? resting.id : order.id,
        price: resting.price,
        quantity: traded,
      });
    }

    this.resting = this.resting.filter((resting) => resting.remaining > 0);

    if (order.remaining > 0) {
      this.resting.push(order);
    }

    return { ...order };
  }

  cancelOrder(id) {
    const before = this.resting.length;
    this.resting = this.resting.filter((order) => order.id !== id);
    return this.resting.length < before;
  }

  levels(side) {
    const byPrice = new Map();

    for (const order of this.resting.filter((resting) => resting.side === side)) {
      if (!byPrice.has(order.price)) {
        byPrice.set(order.price, []);
      }

      byPrice.get(order.price).push(order);
    }

    return [...byPrice.entries()]
      .sort(([a], [b]) => (side === SIDES.BUY ? b - a : a - b))
      .map(([price, orders]) => ({
        price,
        totalQuantity: orders.reduce((sum, order) => sum + order.remaining, 0),
        orders: orders
          .sort((a, b) => a.sequence - b.sequence)
          .map(({ id, remaining }) => ({ id, remaining })),
      }));
  }
}

function summarizeLevels(levels) {
  return levels.map(({ price, totalQuantity, orders }) => ({
    price,
    totalQuantity,
    orders: orders.map(({ id, remaining }) => ({ id, remaining })),
  }));
}

function assertBookInvariants(book, submitted, cancelledRemaining) {
  const bids = book.listBids();
  const asks = book.listAsks();

  assertValidAVL(book.bids, "compras");
  assertValidAVL(book.asks, "vendas");
  assert.equal(book.bids.size, bids.length);
  assert.equal(book.asks.size, asks.length);

  if (bids.length > 0 && asks.length > 0) {
    assert.ok(bids[0].price < asks[0].price, "livro cruzado: melhor compra >= melhor venda");
  }

  for (const level of [...bids, ...asks]) {
    assert.ok(level.orders.length > 0, `nível ${level.price} vazio continua na árvore`);
    assert.equal(level.orderCount, level.orders.length);

    for (let index = 1; index < level.orders.length; index += 1) {
      assert.ok(level.orders[index - 1].sequence < level.orders[index].sequence, "fila fora da ordem de chegada");
    }
  }

  const tradedById = new Map();

  for (const trade of book.getTrades()) {
    assert.ok(trade.quantity > 0);
    tradedById.set(trade.buyOrderId, (tradedById.get(trade.buyOrderId) ?? 0) + trade.quantity);
    tradedById.set(trade.sellOrderId, (tradedById.get(trade.sellOrderId) ?? 0) + trade.quantity);
  }

  for (const [id, quantity] of submitted) {
    const live = book.getOrder(id);
    const remaining = live === null ? 0 : live.remaining;
    const cancelled = cancelledRemaining.get(id) ?? 0;

    assert.equal(
      (tradedById.get(id) ?? 0) + remaining + cancelled,
      quantity,
      `ordem ${id}: negociado + pendente + cancelado deve somar a quantidade original`,
    );
  }
}

function runRandomSession(seed, operations) {
  const random = createRandom(seed);
  const book = new OrderBook();
  const reference = new ReferenceBook();
  const submitted = new Map();
  const cancelledRemaining = new Map();

  for (let step = 0; step < operations; step += 1) {
    const roll = random(100);

    if (roll < 70) {
      const side = random(2) === 0 ? SIDES.BUY : SIDES.SELL;
      const price = 9_500 + random(21) * 50;
      const quantity = 1 + random(50);

      const actual = book.addOrder(side, price, quantity);
      const expected = reference.addOrder(side, price, quantity);

      assert.deepEqual(actual, expected, `passo ${step}: ordem devolvida difere`);
      submitted.set(actual.id, quantity);
    } else {
      const id = 1 + random(reference.nextId + 2);
      const pending = book.getOrder(id);
      const actual = book.cancelOrder(id);

      assert.equal(actual, reference.cancelOrder(id), `passo ${step}: cancelamento da ordem ${id} difere`);

      if (actual) {
        cancelledRemaining.set(id, pending.remaining);
      }
    }

    assert.deepEqual(book.getTrades(), reference.trades, `passo ${step}: histórico difere`);
    assert.deepEqual(summarizeLevels(book.listBids()), reference.levels(SIDES.BUY), `passo ${step}: compras diferem`);
    assert.deepEqual(summarizeLevels(book.listAsks()), reference.levels(SIDES.SELL), `passo ${step}: vendas diferem`);
    assertBookInvariants(book, submitted, cancelledRemaining);
  }

  return { book, reference };
}

test("confere o livro com uma implementação de referência em sessões aleatórias", () => {
  for (const seed of [1, 7, 42, 2026, 31_337]) {
    const { book } = runRandomSession(seed, 1_500);

    assert.ok(book.getTrades().length > 100, `semente ${seed}: a sessão deveria gerar negociações`);
  }
});

test("mantém as AVLs balanceadas com muitos níveis de preço distintos", () => {
  const book = new OrderBook();
  const random = createRandom(99);

  for (let index = 0; index < 2_000; index += 1) {
    book.addOrder(SIDES.BUY, 1 + index, 1);
    book.addOrder(SIDES.SELL, 1_000_000 - index, 1);
  }

  const bids = assertValidAVL(book.bids, "compras");
  const asks = assertValidAVL(book.asks, "vendas");

  assert.equal(bids.count, 2_000);
  assert.equal(asks.count, 2_000);
  assert.ok(bids.height <= Math.ceil(1.44 * Math.log2(2_000 + 2)), `altura ${bids.height} acima do limite da AVL`);
  assert.ok(asks.height <= Math.ceil(1.44 * Math.log2(2_000 + 2)), `altura ${asks.height} acima do limite da AVL`);

  for (let index = 0; index < 1_500; index += 1) {
    book.cancelOrder(1 + random(4_000));
  }

  assertValidAVL(book.bids, "compras");
  assertValidAVL(book.asks, "vendas");
});

test("uma ordem agressiva varre todos os níveis do outro lado e esvazia a árvore", () => {
  const book = new OrderBook();

  for (let price = 1_000; price < 1_100; price += 1) {
    book.addOrder(SIDES.SELL, price, 2);
    book.addOrder(SIDES.SELL, price, 3);
  }

  assert.equal(book.asks.size, 100);

  const sweep = book.addOrder(SIDES.BUY, 2_000, 600);
  const trades = book.getTrades();

  assert.equal(sweep.remaining, 100);
  assert.equal(trades.length, 200);
  assert.equal(book.asks.size, 0);
  assert.equal(book.asks.root, null);
  assert.equal(book.bestAsk(), null);
  assert.equal(book.bestBid().price, 2_000);
  assert.deepEqual(
    trades.slice(0, 3).map(({ price, quantity, sellOrderId }) => ({ price, quantity, sellOrderId })),
    [
      { price: 1_000, quantity: 2, sellOrderId: 1 },
      { price: 1_000, quantity: 3, sellOrderId: 2 },
      { price: 1_001, quantity: 2, sellOrderId: 3 },
    ],
  );
  assertValidAVL(book.asks, "vendas");
});
