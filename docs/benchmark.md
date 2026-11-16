# Benchmark da Árvore AVL

Gerado por `npm run bench` em 16/11/2026, 15:43:07, Node.js v26.13.0, AMD Ryzen 5 3450U with Radeon Vega Mobile Gfx.
Cada valor é a mediana de 3 execuções. Busca e máximo fazem n consultas; inserção e remoção são o tempo total para n chaves.

Compara a AVL do projeto com uma árvore binária de busca sem balanceamento e com um array ordenado (busca binária + `splice`).
Chaves são inteiros distintos de 1 a n. As buscas e remoções usam ordem aleatória.

### Chaves em ordem aleatória

| n | Estrutura | Altura | Inserção (ms) | Busca (ns/op) | Máximo (ns/op) | Remoção (ms) |
|---:|---|---:|---:|---:|---:|---:|
| 1.000 | AVL | 12 | 0,42 | 121 | 160 | 0,32 |
| 1.000 | ABB sem balanceamento | 20 | 0,74 | 145 | 48 | 0,16 |
| 1.000 | Array ordenado |  | 0,35 | 86 | 44 | 0,43 |
| 10.000 | AVL | 16 | 3,18 | 116 | 30 | 2,82 |
| 10.000 | ABB sem balanceamento | 30 | 4,70 | 109 | 8 | 1,09 |
| 10.000 | Array ordenado |  | 14 | 77 | 3 | 13 |
| 100.000 | AVL | 20 | 58 | 379 | 16 | 63 |
| 100.000 | ABB sem balanceamento | 40 | 82 | 393 | 20 | 40 |
| 100.000 | Array ordenado |  | 1.484 | 208 | 39 | 3.015 |
| 1.000.000 | AVL | 24 | 1.629 | 1.091 | 33 | 1.642 |
| 1.000.000 | ABB sem balanceamento | 48 | 1.774 | 1.207 | 17 | 1.115 |
| 1.000.000 | Array ordenado |  | não medido |  |  |  |

### Chaves em ordem crescente (preços chegando em sequência)

| n | Estrutura | Altura | Inserção (ms) | Busca (ns/op) | Máximo (ns/op) | Remoção (ms) |
|---:|---|---:|---:|---:|---:|---:|
| 1.000 | AVL | 10 | 0,12 | 78 | 18 | 0,15 |
| 1.000 | ABB sem balanceamento | 1.000 | 11 | 843 | 1.567 | 0,51 |
| 1.000 | Array ordenado |  | 0,12 | 74 | 9 | 0,24 |
| 10.000 | AVL | 14 | 1,56 | 128 | 23 | 2,32 |
| 10.000 | ABB sem balanceamento | 10.000 | 1.447 | 12.790 | 25.006 | 76 |
| 10.000 | Array ordenado |  | 2,53 | 146 | 9 | 25 |
| 100.000 | AVL | 17 | 42 | 720 | 30 | 112 |
| 100.000 | ABB sem balanceamento |  | não medido |  |  |  |
| 100.000 | Array ordenado |  | 16 | 149 | 3 | 2.545 |
| 1.000.000 | AVL | 20 | 345 | 1.231 | 41 | 1.508 |
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
