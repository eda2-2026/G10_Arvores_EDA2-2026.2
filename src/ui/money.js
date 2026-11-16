const REAIS_PATTERN = /^(\d{1,13})(?:[.,](\d{1,2}))?$/;

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

export function formatReais(cents) {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");

  return `${whole},${fraction}`;
}
