const REAIS_PATTERN = /^(\d{1,13})(?:[.,](\d{1,2}))?$/;

/**
 * Converte um preço digitado em reais ("10", "10,5", "10,50" ou "10.50")
 * para centavos inteiros, que é como o livro de ofertas guarda os preços.
 * Retorna null quando o texto não é um valor válido maior que zero.
 */
export function parseReais(text) {
  if (typeof text !== "string") {
    return null;
  }

  const match = REAIS_PATTERN.exec(text.trim());

  if (match === null) {
    return null;
  }

  const [, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return cents > 0 && Number.isSafeInteger(cents) ? cents : null;
}

/** Formata centavos como reais com vírgula decimal: 1050 → "10,50". */
export function formatReais(cents) {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");

  return `${whole},${fraction}`;
}
