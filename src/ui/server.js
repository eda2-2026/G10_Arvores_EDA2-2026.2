import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

import { SIDES } from "../models/order.js";
import { OrderBook } from "../order-book/order-book.js";
import { formatReais, parseReais } from "./money.js";

const PUBLIC_DIR = new URL("./public/", import.meta.url);
const MAX_BODY_BYTES = 10_000;


const STATIC_FILES = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
  ["/style.css", { file: "style.css", type: "text/css; charset=utf-8" }],
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;

    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "Corpo da requisição muito grande.");
    }

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Corpo da requisição não é um JSON válido.");
  }
}

function parseOrderInput(body) {
  if (body === null || typeof body !== "object") {
    throw new HttpError(400, "Envie side, price e quantity.");
  }

  const { side, price, quantity } = body;

  if (side !== SIDES.BUY && side !== SIDES.SELL) {
    throw new HttpError(400, 'Lado deve ser "buy" (compra) ou "sell" (venda).');
  }

  const cents = parseReais(String(price ?? ""));

  if (cents === null) {
    throw new HttpError(400, "Preço inválido: use reais com até 2 casas decimais, maior que zero (ex.: 10,50).");
  }

  const amount = Number(quantity);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new HttpError(400, "Quantidade deve ser um número inteiro maior que zero.");
  }

  return { side, price: cents, quantity: amount };
}

function orderToJson(order) {
  return { ...order, priceText: formatReais(order.price) };
}

function levelToJson(level) {
  return {
    price: level.price,
    priceText: formatReais(level.price),
    totalQuantity: level.totalQuantity,
    orderCount: level.orderCount,
    orders: level.orders.map(orderToJson),
  };
}

function tradeToJson(trade) {
  return { ...trade, priceText: formatReais(trade.price) };
}

function treeStats(tree) {
  return { nodes: tree.size, height: tree.root === null ? 0 : tree.root.height };
}

function bookSnapshot(book) {
  const bestBid = book.bestBid();
  const bestAsk = book.bestAsk();
  const spread = bestBid !== null && bestAsk !== null ? bestAsk.price - bestBid.price : null;

  return {
    bestBid: bestBid === null ? null : levelToJson(bestBid),
    bestAsk: bestAsk === null ? null : levelToJson(bestAsk),
    spread,
    spreadText: spread === null ? null : formatReais(spread),
    bids: book.listBids().map(levelToJson),
    asks: book.listAsks().map(levelToJson),
    avl: { bids: treeStats(book.bids), asks: treeStats(book.asks) },
  };
}

async function handleApi(book, request, response, path) {
  if (path === "/api/book" && request.method === "GET") {
    return sendJson(response, 200, bookSnapshot(book));
  }

  if (path === "/api/trades" && request.method === "GET") {
    return sendJson(response, 200, book.getTrades().map(tradeToJson));
  }

  if (path === "/api/orders" && request.method === "POST") {
    const { side, price, quantity } = parseOrderInput(await readJsonBody(request));
    const tradesBefore = book.getTrades().length;
    const order = book.addOrder(side, price, quantity);
    const trades = book.getTrades().slice(tradesBefore).map(tradeToJson);

    return sendJson(response, 201, { order: orderToJson(order), trades });
  }

  const cancelMatch = /^\/api\/orders\/(\d+)$/.exec(path);

  if (cancelMatch !== null && request.method === "DELETE") {
    const id = Number(cancelMatch[1]);

    if (!book.cancelOrder(id)) {
      throw new HttpError(404, `Ordem ${id} não está pendente no livro.`);
    }

    return sendJson(response, 200, { cancelled: id });
  }

  throw new HttpError(404, "Rota não encontrada.");
}

async function handleStatic(request, response, path) {
  const entry = STATIC_FILES.get(path);

  if (entry === undefined || request.method !== "GET") {
    throw new HttpError(404, "Página não encontrada.");
  }

  const content = await readFile(new URL(entry.file, PUBLIC_DIR));
  response.writeHead(200, { "Content-Type": entry.type });
  response.end(content);
}

/** Cria o servidor HTTP do simulador. Cada servidor tem o seu próprio livro. */
export function createAppServer(book = new OrderBook()) {
  return createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;

    try {
      if (path.startsWith("/api/")) {
        await handleApi(book, request, response, path);
      } else {
        await handleStatic(request, response, path);
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Erro interno do servidor.";

      if (status === 500) {
        console.error(error);
      }

      sendJson(response, status, { error: message });
    }
  });
}
