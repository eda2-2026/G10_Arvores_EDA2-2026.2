# Benchmark da Árvore AVL

Gerado por `npm run bench`

Compara a AVL do projeto com uma árvore binária de busca sem balanceamento e com um array ordenado (busca binária + `splice`).
Chaves são inteiros distintos de 1 a n. As buscas e remoções usam ordem aleatória.

### Chaves em ordem aleatória

| n | Estrutura | Altura | Inserção (ms) | Busca (ns/op) | Máximo (ns/op) | Remoção (ms) |
|---:|---|---:|---:|---:|---:|---:|
| 1.000 | AVL | 12 | 0,92 | 201 | 29 | 0,45 |
| 1.000 | ABB sem balanceamento | 20 | 0,74 | 205 | 118 | 0,23 |
| 1.000 | Array ordenado |  | 0,34 | 115 | 39 | 0,36 |
| 10.000 | AVL | 16 | 3,70 | 120 | 26 | 3,10 |
| 10.000 | ABB sem balanceamento | 30 | 6,53 | 115 | 9 | 1,10 |
| 10.000 | Array ordenado |  | 19 | 103 | 4 | 19 |
| 100.000 | AVL | 20 | 54 | 369 | 21 | 55 |
| 100.000 | ABB sem balanceamento | 40 | 80 | 357 | 18 | 34 |
| 100.000 | Array ordenado |  | 1.402 | 192 | 36 | 2.340 |
| 1.000.000 | AVL | 24 | 1.364 | 893 | 27 | 1.339 |
| 1.000.000 | ABB sem balanceamento | 48 | 1.633 | 1.164 | 17 | 1.060 |
| 1.000.000 | Array ordenado |  | não medido |  |  |  |

### Chaves em ordem crescente (preços chegando em sequência)

| n | Estrutura | Altura | Inserção (ms) | Busca (ns/op) | Máximo (ns/op) | Remoção (ms) |
|---:|---|---:|---:|---:|---:|---:|
| 1.000 | AVL | 10 | 0,15 | 93 | 21 | 0,19 |
| 1.000 | ABB sem balanceamento | 1.000 | 13 | 1.085 | 1.754 | 0,61 |
| 1.000 | Array ordenado |  | 0,11 | 71 | 10 | 0,24 |
| 10.000 | AVL | 14 | 2,97 | 235 | 53 | 4,64 |
| 10.000 | ABB sem balanceamento | 10.000 | 1.113 | 9.111 | 17.656 | 61 |
| 10.000 | Array ordenado |  | 1,11 | 74 | 3 | 13 |
| 100.000 | AVL | 17 | 19 | 395 | 31 | 73 |
| 100.000 | ABB sem balanceamento |  | não medido |  |  |  |
| 100.000 | Array ordenado |  | 15 | 121 | 3 | 2.205 |
| 1.000.000 | AVL | 20 | 349 | 940 | 30 | 1.473 |
| 1.000.000 | ABB sem balanceamento |  | não medido |  |  |  |
| 1.000.000 | Array ordenado |  | não medido |  |  |  |

### Altura máxima permitida para uma AVL

| n | log₂(n) | Limite teórico da AVL (≈ 1,44·log₂ n) |
|---:|---:|---:|
| 1.000 | 10,0 | 14 |
| 10.000 | 13,3 | 18 |
| 100.000 | 16,6 | 23 |
| 1.000.000 | 19,9 | 28 |

Casos marcados como "não medido" levariam tempo demais: a ABB com chaves crescentes vira uma lista (O(n²) para n inserções) e o array ordenado desloca O(n) elementos a cada inserção ou remoção.
