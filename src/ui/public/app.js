const elements = {
  orderForm: document.querySelector("#order-form"),
  orderSubmit: document.querySelector("#order-submit"),
  cancelForm: document.querySelector("#cancel-form"),
  message: document.querySelector("#message"),
  asks: document.querySelector("#asks"),
  bids: document.querySelector("#bids"),
  asksAvl: document.querySelector("#asks-avl"),
  bidsAvl: document.querySelector("#bids-avl"),
  spread: document.querySelector("#spread"),
  trades: document.querySelector("#trades"),
};

const SIDE_TEXT = { buy: "Compra", sell: "Venda" };
const SIDE_VERB = { buy: "Comprar", sell: "Vender" };
const SERVER_OFFLINE = "O servidor não respondeu. Rode npm start e recarregue a página.";
const REFRESH_FAILED =
  "Não foi possível atualizar o livro. Reinicie o servidor (npm start) e recarregue a página.";

let lastTradeId = 0;

async function api(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new Error(SERVER_OFFLINE);
  }

  let body;

  try {
    body = await response.json();
  } catch {
    throw new Error(`O servidor respondeu ${response.status} sem os dados esperados.`);
  }

  if (!response.ok) {
    throw new Error(body.error ?? `O servidor respondeu ${response.status}.`);
  }

  return body;
}

function element(tag, className, text) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function showMessage(text, kind = "ok") {
  elements.message.textContent = text;
  elements.message.className = kind;
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function describeTree({ nodes, height }) {
  if (nodes === 0) {
    return "Árvore vazia";
  }

  return `${plural(nodes, "nível de preço", "níveis de preço")} na AVL, altura ${height}`;
}

function orderChip(order) {
  const chip = element("li", "chip");
  chip.append(element("span", "chip-id", `#${order.id}`), element("span", "chip-qty", String(order.remaining)));

  const cancel = element("button", "chip-cancel", "×");
  cancel.type = "button";
  cancel.dataset.cancelId = String(order.id);
  cancel.setAttribute("aria-label", `Cancelar ordem ${order.id}`);
  cancel.title = `Cancelar ordem ${order.id}`;
  chip.append(cancel);

  return chip;
}

function levelRow(level, maxQuantity) {
  const row = element("li", "level");
  row.style.setProperty("--depth", (level.totalQuantity / maxQuantity).toFixed(4));

  const orders = element("ul", "chips");
  orders.append(...level.orders.map(orderChip));

  row.append(
    element("span", "price", level.priceText),
    element("span", "quantity", String(level.totalQuantity)),
    orders,
  );

  return row;
}

function renderSide(list, levels, maxQuantity, emptyText) {
  if (levels.length === 0) {
    list.replaceChildren(element("li", "empty", emptyText));
    return;
  }

  list.replaceChildren(...levels.map((level) => levelRow(level, maxQuantity)));
}

function renderSpread(book) {
  if (book.spreadText !== null) {
    elements.spread.textContent = `Spread de R$ ${book.spreadText} entre a melhor venda e a melhor compra`;
    return;
  }

  if (book.bestBid === null && book.bestAsk === null) {
    elements.spread.textContent = "Livro vazio. Envie a primeira ordem pela boleta.";
  } else {
    const missing = book.bestAsk === null ? "venda" : "compra";
    elements.spread.textContent = `Sem spread: ainda não há oferta de ${missing}.`;
  }
}

function renderBook(book) {
  const maxQuantity = Math.max(1, ...[...book.bids, ...book.asks].map((level) => level.totalQuantity));

  renderSide(elements.asks, book.asks.slice().reverse(), maxQuantity, "Nenhuma oferta de venda.");
  renderSide(elements.bids, book.bids, maxQuantity, "Nenhuma oferta de compra.");
  renderSpread(book);

  elements.asksAvl.textContent = describeTree(book.avl.asks);
  elements.bidsAvl.textContent = describeTree(book.avl.bids);
}

function renderTrades(trades) {
  if (trades.length === 0) {
    elements.trades.replaceChildren(
      element(
        "li",
        "empty",
        "Nenhuma negociação ainda. Ela acontece quando uma compra alcança o preço de uma venda.",
      ),
    );
    return;
  }

  const rows = trades
    .slice()
    .reverse()
    .map((trade) => {
      const row = element("li", trade.id > lastTradeId ? "trade fresh" : "trade");
      row.append(
        element("span", "trade-id", `#${trade.id}`),
        element("span", "trade-main", `${trade.quantity} a R$ ${trade.priceText}`),
        element("span", "trade-parties", `compra #${trade.buyOrderId}, venda #${trade.sellOrderId}`),
      );
      return row;
    });

  elements.trades.replaceChildren(...rows);
  lastTradeId = trades[trades.length - 1].id;
}

async function refresh() {
  const [book, trades] = await Promise.all([api("/api/book"), api("/api/trades")]);

  renderBook(book);
  renderTrades(trades);
}

async function refreshAfter(successText) {
  try {
    await refresh();
    showMessage(successText);
  } catch {
    showMessage(`${successText} ${REFRESH_FAILED}`, "warn");
  }
}

function updateSubmitLabel() {
  const data = new FormData(elements.orderForm);
  const side = data.get("side");
  const price = String(data.get("price") ?? "").trim();
  const quantity = String(data.get("quantity") ?? "").trim();

  elements.orderForm.dataset.side = side;
  elements.orderSubmit.textContent = price && quantity
    ? `${SIDE_VERB[side]} ${quantity} a R$ ${price}`
    : SIDE_VERB[side];
}

function describeOrder({ order, trades }) {
  const traded = order.quantity - order.remaining;
  let text = `${SIDE_TEXT[order.side]} #${order.id} enviada: ${order.quantity} a R$ ${order.priceText}.`;

  if (trades.length > 0) {
    text += ` ${traded} negociada(s) em ${plural(trades.length, "negociação", "negociações")}.`;
  }

  text += order.remaining === 0
    ? " Ordem totalmente executada."
    : ` ${order.remaining} aguardando no livro.`;

  return text;
}

async function cancelOrder(id) {
  try {
    await api(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    showMessage(error.message, "error");
    return;
  }

  await refreshAfter(`Ordem #${id} cancelada.`);
}

elements.orderForm.addEventListener("input", updateSubmitLabel);

elements.orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(elements.orderForm);
  let result;

  try {
    result = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        side: data.get("side"),
        price: data.get("price"),
        quantity: data.get("quantity"),
      }),
    });
  } catch (error) {
    showMessage(error.message, "error");
    return;
  }

  elements.orderForm.querySelector("[name=quantity]").value = "";
  updateSubmitLabel();
  await refreshAfter(describeOrder(result));
});

elements.cancelForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = new FormData(elements.cancelForm).get("id");

  await cancelOrder(id);
  elements.cancelForm.reset();
});

document.querySelector(".ladder").addEventListener("click", (event) => {
  const button = event.target.closest("[data-cancel-id]");

  if (button !== null) {
    cancelOrder(button.dataset.cancelId);
  }
});

updateSubmitLabel();
refresh()
  .then(() => {
    for (const row of elements.trades.querySelectorAll(".fresh")) {
      row.classList.remove("fresh");
    }
  })
  .catch(() => showMessage(REFRESH_FAILED, "error"));
