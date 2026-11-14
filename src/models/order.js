export const SIDES = Object.freeze({
  BUY: "buy",
  SELL: "sell",
});

const VALID_SIDES = new Set(Object.values(SIDES));

function assertPositiveInteger(value, field) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be an integer.`);
  }

  if (value <= 0) {
    throw new RangeError(`${field} must be greater than zero.`);
  }
}

export class Order {
  /**
   * @param {object} data
   * @param {number} data.id Identificador único da ordem.
   * @param {"buy" | "sell"} data.side Lado da ordem.
   * @param {number} data.price Preço limite, em centavos.
   * @param {number} data.quantity Quantidade total pedida.
   * @param {number} data.sequence Ordem de chegada no livro (menor = mais antiga).
   */
  constructor({ id, side, price, quantity, sequence }) {
    if (!VALID_SIDES.has(side)) {
      throw new TypeError(`Side must be "${SIDES.BUY}" or "${SIDES.SELL}".`);
    }

    assertPositiveInteger(id, "Id");
    assertPositiveInteger(price, "Price");
    assertPositiveInteger(quantity, "Quantity");
    assertPositiveInteger(sequence, "Sequence");

    this.id = id;
    this.side = side;
    this.price = price;
    this.quantity = quantity;
    this.remaining = quantity;
    this.sequence = sequence;
  }

  get isBuy() {
    return this.side === SIDES.BUY;
  }

  get isFilled() {
    return this.remaining === 0;
  }
}
