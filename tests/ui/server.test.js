import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { createAppServer } from "../../src/ui/server.js";

async function startServer(t) {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, { method = "GET", body } = {}) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    const isJson = response.headers.get("content-type")?.startsWith("application/json");

    return { status: response.status, headers: response.headers, body: isJson ? JSON.parse(text) : text };
  }

  return request;
}

test("serve a página e os arquivos da interface", async (t) => {
  const request = await startServer(t);

  const page = await request("/");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(page.body, /id="order-form"/);
  assert.match(page.body, /id="cancel-form"/);

  assert.equal((await request("/app.js")).status, 200);
  assert.equal((await request("/style.css")).status, 200);
});

test("não serve arquivos fora da lista da interface", async (t) => {
  const request = await startServer(t);

  for (const path of ["/server.js", "/../package.json", "/%2e%2e/package.json", "/index.html"]) {
    assert.equal((await request(path)).status, 404, path);
  }
});

test("começa com o livro e o histórico vazios", async (t) => {
  const request = await startServer(t);

  const book = await request("/api/book");
  assert.equal(book.status, 200);
  assert.deepEqual(book.body, {
    bestBid: null,
    bestAsk: null,
    spread: null,
    spreadText: null,
    bids: [],
    asks: [],
    avl: { bids: { nodes: 0, height: 0 }, asks: { nodes: 0, height: 0 } },
  });

  assert.deepEqual((await request("/api/trades")).body, []);
});

test("cadastra ordens em reais e mostra o livro em reais", async (t) => {
  const request = await startServer(t);

  const created = await request("/api/orders", {
    method: "POST",
    body: { side: "buy", price: "10,50", quantity: "100" },
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.order.id, 1);
  assert.equal(created.body.order.price, 1050);
  assert.equal(created.body.order.priceText, "10,50");
  assert.equal(created.body.order.remaining, 100);
  assert.deepEqual(created.body.trades, []);

  await request("/api/orders", { method: "POST", body: { side: "sell", price: "11", quantity: 40 } });

  const book = (await request("/api/book")).body;
  assert.equal(book.bestBid.priceText, "10,50");
  assert.equal(book.bestAsk.priceText, "11,00");
  assert.equal(book.spread, 50);
  assert.equal(book.spreadText, "0,50");
  assert.equal(book.bids[0].orders[0].id, 1);
  assert.equal(book.asks[0].totalQuantity, 40);
});

test("informa quantos nós e qual a altura de cada árvore AVL", async (t) => {
  const request = await startServer(t);

  for (const price of ["10,00", "10,10", "10,20", "10,30"]) {
    await request("/api/orders", { method: "POST", body: { side: "buy", price, quantity: 1 } });
  }

  // Mesmo preço: entra na fila do nível existente, sem criar nó novo.
  await request("/api/orders", { method: "POST", body: { side: "buy", price: "10,30", quantity: 1 } });
  await request("/api/orders", { method: "POST", body: { side: "sell", price: "11,00", quantity: 1 } });

  const { avl } = (await request("/api/book")).body;
  assert.deepEqual(avl, { bids: { nodes: 4, height: 3 }, asks: { nodes: 1, height: 1 } });
});

test("devolve as negociações geradas pela ordem e grava o histórico", async (t) => {
  const request = await startServer(t);

  await request("/api/orders", { method: "POST", body: { side: "sell", price: "10,00", quantity: 30 } });
  await request("/api/orders", { method: "POST", body: { side: "sell", price: "10,20", quantity: 30 } });

  const buy = await request("/api/orders", {
    method: "POST",
    body: { side: "buy", price: "10,20", quantity: 50 },
  });

  assert.equal(buy.body.order.remaining, 0);
  assert.deepEqual(
    buy.body.trades.map(({ priceText, quantity, buyOrderId, sellOrderId }) => ({
      priceText,
      quantity,
      buyOrderId,
      sellOrderId,
    })),
    [
      { priceText: "10,00", quantity: 30, buyOrderId: 3, sellOrderId: 1 },
      { priceText: "10,20", quantity: 20, buyOrderId: 3, sellOrderId: 2 },
    ],
  );

  const trades = (await request("/api/trades")).body;
  assert.equal(trades.length, 2);

  const book = (await request("/api/book")).body;
  assert.equal(book.bids.length, 0);
  assert.equal(book.asks[0].orders[0].remaining, 10);
});

test("cancela uma ordem pendente", async (t) => {
  const request = await startServer(t);

  await request("/api/orders", { method: "POST", body: { side: "buy", price: "9,90", quantity: 10 } });

  const cancelled = await request("/api/orders/1", { method: "DELETE" });
  assert.equal(cancelled.status, 200);
  assert.deepEqual(cancelled.body, { cancelled: 1 });
  assert.deepEqual((await request("/api/book")).body.bids, []);

  const again = await request("/api/orders/1", { method: "DELETE" });
  assert.equal(again.status, 404);
  assert.match(again.body.error, /não está pendente/);
});

test("rejeita entradas inválidas com mensagem em português", async (t) => {
  const request = await startServer(t);
  const invalidBodies = [
    [{ side: "compra", price: "10", quantity: 1 }, /Lado/],
    [{ side: "buy", price: "10,505", quantity: 1 }, /Preço inválido/],
    [{ side: "buy", price: "0", quantity: 1 }, /Preço inválido/],
    [{ side: "buy", price: "10", quantity: "1.5" }, /Quantidade/],
    [{ side: "buy", price: "10", quantity: 0 }, /Quantidade/],
    [{ side: "buy", price: "10" }, /Quantidade/],
    [null, /Envie/],
    ["{não é json", /JSON/],
  ];

  for (const [body, message] of invalidBodies) {
    const response = await request("/api/orders", { method: "POST", body: body === null ? "null" : body });

    assert.equal(response.status, 400, JSON.stringify(body));
    assert.match(response.body.error, message);
  }

  assert.deepEqual((await request("/api/book")).body.bids, []);
});

test("rejeita corpo grande demais e rotas desconhecidas", async (t) => {
  const request = await startServer(t);

  const huge = await request("/api/orders", { method: "POST", body: "x".repeat(20_000) });
  assert.equal(huge.status, 413);

  assert.equal((await request("/api/nada")).status, 404);
  assert.equal((await request("/api/orders", { method: "GET" })).status, 404);
  assert.equal((await request("/api/orders/abc", { method: "DELETE" })).status, 404);
});
