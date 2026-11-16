import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { createAppServer } from "../../src/ui/server.js";

async function startServer(t) {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return async function request(path, { method = "GET", body } = {}) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    return { status: response.status, body: await response.json() };
  };
}

function ladder(book) {
  const describe = (levels) =>
    levels.map((level) => `${level.priceText}: ${level.orders.map((order) => `#${order.id}=${order.remaining}`).join(" ")}`);

  return { vendas: describe(book.asks), compras: describe(book.bids) };
}

test("pregão completo pela API: cadastro, prioridade, execução parcial, cancelamento e histórico", async (t) => {
  const request = await startServer(t);
  const send = (side, price, quantity) => request("/api/orders", { method: "POST", body: { side, price, quantity } });

  await send("sell", "10,60", 25);
  await send("sell", "10,60", 15);
  await send("sell", "10,80", 40);
  await send("sell", "11,00", 20);
  await send("buy", "10,40", 60);
  await send("buy", "10,20", 100);

  let book = (await request("/api/book")).body;
  assert.deepEqual(ladder(book), {
    vendas: ["10,60: #1=25 #2=15", "10,80: #3=40", "11,00: #4=20"],
    compras: ["10,40: #5=60", "10,20: #6=100"],
  });
  assert.equal(book.spreadText, "0,20");
  assert.deepEqual(book.avl, { bids: { nodes: 2, height: 2 }, asks: { nodes: 3, height: 2 } });

  const aggressive = await send("buy", "10,80", 70);
  assert.equal(aggressive.status, 201);
  assert.equal(aggressive.body.order.remaining, 0);
  assert.deepEqual(
    aggressive.body.trades.map(({ sellOrderId, priceText, quantity }) => `#${sellOrderId} ${quantity}@${priceText}`),
    ["#1 25@10,60", "#2 15@10,60", "#3 30@10,80"],
  );

  book = (await request("/api/book")).body;
  assert.deepEqual(ladder(book), {
    vendas: ["10,80: #3=10", "11,00: #4=20"],
    compras: ["10,40: #5=60", "10,20: #6=100"],
  });
  assert.equal(book.avl.asks.nodes, 2);

  const partial = await send("sell", "10,30", 80);
  assert.equal(partial.body.order.remaining, 20);
  assert.deepEqual(
    partial.body.trades.map(({ buyOrderId, priceText, quantity }) => `#${buyOrderId} ${quantity}@${priceText}`),
    ["#5 60@10,40"],
  );

  book = (await request("/api/book")).body;
  assert.deepEqual(ladder(book), {
    vendas: ["10,30: #8=20", "10,80: #3=10", "11,00: #4=20"],
    compras: ["10,20: #6=100"],
  });
  assert.equal(book.bestAsk.priceText, "10,30");
  assert.equal(book.spreadText, "0,10");

  assert.equal((await request("/api/orders/8", { method: "DELETE" })).status, 200);
  assert.equal((await request("/api/orders/8", { method: "DELETE" })).status, 404);
  assert.equal((await request("/api/orders/5", { method: "DELETE" })).status, 404);

  book = (await request("/api/book")).body;
  assert.equal(book.bestAsk.priceText, "10,80");
  assert.equal(book.spreadText, "0,60");

  const trades = (await request("/api/trades")).body;
  assert.deepEqual(
    trades.map(({ id, buyOrderId, sellOrderId, quantity, priceText }) => [id, buyOrderId, sellOrderId, quantity, priceText]),
    [
      [1, 7, 1, 25, "10,60"],
      [2, 7, 2, 15, "10,60"],
      [3, 7, 3, 30, "10,80"],
      [4, 5, 8, 60, "10,40"],
    ],
  );

  const traded = trades.reduce((sum, trade) => sum + trade.quantity, 0);
  const pending = [...book.bids, ...book.asks].reduce((sum, level) => sum + level.totalQuantity, 0);
  assert.equal(traded * 2 + pending + 20, 25 + 15 + 40 + 20 + 60 + 100 + 70 + 80);
});
