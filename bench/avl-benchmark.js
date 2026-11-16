import { writeFile } from "node:fs/promises";
import { cpus } from "node:os";

import { STRUCTURES } from "./structures.js";

const ROUNDS = 3;
const SIZES = [1_000, 10_000, 100_000, 1_000_000];
const LIMITS = {
  avl: { random: 1_000_000, ascending: 1_000_000 },
  bst: { random: 1_000_000, ascending: 10_000 },
  array: { random: 100_000, ascending: 100_000 },
};
const SCENARIOS = {
  random: "chaves em ordem aleatória",
  ascending: "chaves em ordem crescente (preços chegando em sequência)",
};

function createRandom(seed) {
  let state = seed >>> 0;

  return function nextInt(maxExclusive) {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296) * maxExclusive);
  };
}

function shuffled(size, seed) {
  const random = createRandom(seed);
  const values = Array.from({ length: size }, (_, index) => index + 1);

  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = random(index + 1);
    [values[index], values[target]] = [values[target], values[index]];
  }

  return values;
}

function ascending(size) {
  return Array.from({ length: size }, (_, index) => index + 1);
}

function time(action) {
  const start = process.hrtime.bigint();
  action();
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function runOnce(structure, insertKeys, lookupKeys, removeKeys) {
  const tree = structure.create();
  let found = 0;

  const insert = time(() => {
    for (const key of insertKeys) {
      tree.insert(key, key);
    }
  });

  const height = structure.height(tree);

  const search = time(() => {
    for (const key of lookupKeys) {
      if (tree.get(key) !== undefined) {
        found += 1;
      }
    }
  });

  const max = time(() => {
    for (let index = 0; index < lookupKeys.length; index += 1) {
      tree.max();
    }
  });

  const remove = time(() => {
    for (const key of removeKeys) {
      tree.remove(key);
    }
  });

  if (found !== lookupKeys.length || tree.size !== 0) {
    throw new Error(`${structure.label}: resultado inconsistente no benchmark.`);
  }

  return { insert, search, max, remove, height };
}

function measure(structureKey, scenario, size) {
  const structure = STRUCTURES[structureKey];
  const insertKeys = scenario === "random" ? shuffled(size, 11) : ascending(size);
  const lookupKeys = shuffled(size, 23);
  const removeKeys = shuffled(size, 37);

  const warmup = shuffled(1_000, 5);
  runOnce(structure, warmup, warmup, warmup);

  const rounds = Array.from({ length: ROUNDS }, () => runOnce(structure, insertKeys, lookupKeys, removeKeys));

  return {
    insert: median(rounds.map((round) => round.insert)),
    search: median(rounds.map((round) => round.search)),
    max: median(rounds.map((round) => round.max)),
    remove: median(rounds.map((round) => round.remove)),
    height: rounds[0].height,
  };
}

function avlHeightLimit(size) {
  return Math.floor(1.4405 * Math.log2(size + 2) - 0.3277);
}

function formatNumber(value, decimals = 0) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatMs(value) {
  return formatNumber(value, value < 10 ? 2 : 0);
}

function formatNsPerOp(totalMs, size) {
  return formatNumber((totalMs * 1e6) / size);
}

function formatSize(size) {
  return formatNumber(size);
}

function tableFor(scenario) {
  const lines = [
    `### ${SCENARIOS[scenario][0].toUpperCase()}${SCENARIOS[scenario].slice(1)}`,
    "",
    "| n | Estrutura | Altura | Inserção (ms) | Busca (ns/op) | Máximo (ns/op) | Remoção (ms) |",
    "|---:|---|---:|---:|---:|---:|---:|",
  ];

  for (const size of SIZES) {
    for (const key of Object.keys(STRUCTURES)) {
      const label = STRUCTURES[key].label;

      if (size > LIMITS[key][scenario]) {
        lines.push(`| ${formatSize(size)} | ${label} |  | não medido |  |  |  |`);
        continue;
      }

      process.stderr.write(`  ${scenario}, n=${size}, ${label}...\n`);
      const result = measure(key, scenario, size);
      const height = result.height === null ? "" : formatNumber(result.height);

      lines.push(
        `| ${formatSize(size)} | ${label} | ${height} | ${formatMs(result.insert)} | ${formatNsPerOp(result.search, size)} | ${formatNsPerOp(result.max, size)} | ${formatMs(result.remove)} |`,
      );
    }
  }

  return lines.join("\n");
}

function heightTable() {
  const lines = [
    "| n | log₂(n) | Limite teórico da AVL (≈ 1,44·log₂ n) |",
    "|---:|---:|---:|",
  ];

  for (const size of SIZES) {
    lines.push(`| ${formatSize(size)} | ${formatNumber(Math.log2(size), 1)} | ${avlHeightLimit(size)} |`);
  }

  return lines.join("\n");
}

async function main() {
  const startedAt = new Date();
  process.stderr.write("Rodando benchmark (pode levar alguns minutos)...\n");

  const report = [
    "# Benchmark da Árvore AVL",
    "",
    `Gerado por \`npm run bench\` em ${startedAt.toLocaleString("pt-BR")}, Node.js ${process.version}, ${cpus()[0].model}.`,
    `Cada valor é a mediana de ${ROUNDS} execuções. Busca e máximo fazem n consultas; inserção e remoção são o tempo total para n chaves.`,
    "",
    "Compara a AVL do projeto com uma árvore binária de busca sem balanceamento e com um array ordenado (busca binária + `splice`).",
    "Chaves são inteiros distintos de 1 a n. As buscas e remoções usam ordem aleatória.",
    "",
    tableFor("random"),
    "",
    tableFor("ascending"),
    "",
    "### Altura máxima permitida para uma AVL",
    "",
    heightTable(),
    "",
    "Casos marcados como \"não medido\" levariam tempo demais: a ABB com chaves crescentes vira uma lista (O(n²) para n inserções) e o array ordenado desloca O(n) elementos a cada inserção ou remoção.",
    "",
  ].join("\n");

  process.stdout.write(`${report}\n`);

  if (process.argv.includes("--write")) {
    await writeFile(new URL("../docs/benchmark.md", import.meta.url), report);
    process.stderr.write("Resultado salvo em docs/benchmark.md\n");
  }
}

await main();
