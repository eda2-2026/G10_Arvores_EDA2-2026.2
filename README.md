# Livro de ofertas com Árvore AVL

Simulador do livro de ofertas (*order book*) de uma bolsa de valores para um ativo fictício. As ofertas de compra e de venda são organizadas em duas instâncias de uma mesma Árvore AVL, e as negociações acontecem automaticamente quando os preços se cruzam.

Projeto do grupo 10 da disciplina Estruturas de Dados e Algoritmos 2 (UnB, 2026.2).

## Autores

| Nome | Matrícula |
| --- | --- |
| Enzo Menali | 241011054 |
| Paulo Vitor Gomes | 241025971 |

## Apresentação

[Vídeo de apresentação (5 minutos)](https://drive.google.com/file/d/1ZmFpThngMstD9Pf69yA_r7z1XS4ujZq6/view?usp=sharing)

## Funcionalidades

- Cadastro de ordens limitadas de compra e de venda, com preço em reais e quantidade inteira.
- Casamento automático por prioridade de preço e, no mesmo preço, por ordem de chegada.
- Negociações completas e parciais; o saldo não executado fica no livro.
- Cancelamento de ordens pendentes, inclusive as parcialmente executadas.
- Melhor compra, melhor venda e spread.
- Histórico de negociações.
- Interface web com boleta, escada de preços (com o número de nós e a altura de cada AVL) e fita de negociações.

## Como rodar

Requer Node.js 20 ou superior. Não há dependências para instalar.

```bash
npm start            # abre o simulador em http://127.0.0.1:3000
PORT=3001 npm start  # usa outra porta
npm test             # roda os 91 testes automatizados
npm run bench        # roda o benchmark e regrava docs/benchmark.md (cerca de 1 minuto)
```

## Usando a interface

1. Na **boleta**, escolha *Comprar* ou *Vender*, digite o preço em reais (`10,50`) e a quantidade. O botão mostra o que será enviado, por exemplo *Comprar 100 a R$ 10,50*.
2. A **escada de preços** mostra as vendas em cima e as compras embaixo, com o spread entre elas. Cada linha é um nível de preço, isto é, um nó da AVL, com as ordens daquele preço na ordem de chegada. A barra ao fundo é proporcional à quantidade.
3. Para cancelar, use o **×** ao lado da ordem ou digite o número dela em *Cancelar ordem*.
4. A **fita de negociações** lista as execuções, a mais recente primeiro.

## Como a AVL é usada

```text
                    OrderBook
          ┌─────────────┴─────────────┐
   bids: AVLTree                asks: AVLTree
   (compras, melhor = max)      (vendas, melhor = min)
          │                            │
   nó: chave = preço em centavos, valor = PriceLevel
                                       │
                         OrderQueue (FIFO, lista duplamente encadeada)
                                       │
                                     Order
```

- **Uma implementação, duas instâncias.** `bids` guarda as compras e `asks` as vendas. A melhor compra é o `max()` de `bids` e a melhor venda é o `min()` de `asks`.
- **Cada nó é um nível de preço.** A chave é o preço em centavos (inteiro, para não haver erro de ponto flutuante) e o valor é um `PriceLevel` com a fila das ordens daquele preço.
- **Preço novo vira inserção na AVL; preço existente vira só busca.** Uma ordem num preço que já existe entra no fim da fila do nível, sem mudar a árvore.
- **Nível vazio vira remoção na AVL.** Quando a última ordem de um preço é executada ou cancelada, o nó sai da árvore e a AVL se rebalanceia.
- **A escada é o percurso em ordem** (`inOrder()`), invertido no lado das compras.

A AVL ([src/structures/avl-tree.js](src/structures/avl-tree.js)) implementa inserção, busca, remoção (com sucessor em ordem), mínimo, máximo e percurso em ordem, mantendo a altura em cada nó e rebalanceando com as rotações simples e duplas (LL, RR, LR, RL) na volta da recursão.

## Regras de negociação

1. Uma ordem de compra negocia com as vendas de preço **menor ou igual** ao seu, começando pela mais barata. Uma venda negocia com as compras de preço **maior ou igual**, começando pela mais cara.
2. No mesmo preço, a ordem que chegou primeiro negocia primeiro.
3. A negociação acontece pelo preço da ordem que já estava no livro.
4. A quantidade negociada é a menor entre as duas ordens; o saldo da ordem que chegou continua procurando contrapartes e, se sobrar, fica no livro no seu preço.

## Complexidade

P é o número de níveis de preço de um lado, k o número de negociações geradas por uma ordem e m o número de ordens de um nível.

| Operação | Custo |
| --- | --- |
| Cadastrar ordem sem negociação | O(log P) |
| Cadastrar ordem que gera k negociações | O((k + 1) · log P) |
| Cancelar ordem | O(1) para achar e tirar da fila (índice por ID + lista duplamente encadeada), mais O(log P) se o nível esvaziar |
| Melhor compra / melhor venda | O(log P) |
| Listar o livro | O(P + número de ordens) |
| Quantidade total de um nível | O(m) |

## API HTTP

O servidor usa só o módulo `http` do Node e escuta em `127.0.0.1`.

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/book` | | Melhores ofertas, spread, níveis de cada lado e `avl` (nós e altura de cada árvore) |
| `GET /api/trades` | | Histórico de negociações |
| `POST /api/orders` | `{ "side": "buy" \| "sell", "price": "10,50", "quantity": 100 }` | `201` com a ordem e as negociações que ela gerou; `400` com mensagem em caso de entrada inválida |
| `DELETE /api/orders/:id` | | `200` se cancelou; `404` se a ordem não está pendente |

## Estrutura do projeto

```text
src/
  structures/   avl-node.js, avl-tree.js, order-queue.js
  models/       order.js, price-level.js
  order-book/   order-book.js (livro e motor de negociação)
  ui/           server.js, money.js, public/ (index.html, app.js, style.css)
  index.js      inicia o servidor
tests/          testes unitários, de integração e do benchmark (node:test)
bench/          benchmark da AVL e estruturas de comparação
docs/           resultado do benchmark
```

## Testes

`npm test` roda 91 testes com o executor nativo do Node (`node:test`):

- **Unitários:** AVL (inserção, busca, remoção, as quatro rotações, invariantes em sequências crescentes, decrescentes e aleatórias), ordem, fila FIFO, nível de preço, livro de ofertas e motor de negociação, conversão de reais e servidor HTTP.
- **Integração:** o livro é comparado, passo a passo, com uma implementação de referência simples em cinco sessões aleatórias de 1.500 operações (cerca de 800 negociações cada). Após cada passo, também se verifica que as duas AVL estão válidas, que o livro nunca fica cruzado, que as filas respeitam a ordem de chegada e que a quantidade se conserva (negociado + pendente + cancelado = quantidade original). Há ainda um pregão completo feito pela API HTTP.

## Desempenho

O benchmark compara a AVL com uma árvore binária de busca sem balanceamento e com um array ordenado. Os números completos estão em [docs/benchmark.md](docs/benchmark.md); alguns destaques da execução registrada:

| Situação | AVL | ABB sem balanceamento | Array ordenado |
| --- | ---: | ---: | ---: |
| Altura com 10.000 chaves crescentes | 14 | 10.000 | |
| Busca com 10.000 chaves crescentes | 235 ns | 9.111 ns | 74 ns |
| Altura com 1.000.000 chaves aleatórias | 24 | 48 | |
| Remover 100.000 chaves aleatórias | 55 ms | 34 ms | 2.340 ms |

- Com chaves crescentes, como preços chegando em sequência, a ABB comum vira uma lista e cada operação passa a custar O(n). A AVL continua com altura logarítmica.
- Com chaves aleatórias, a ABB comum fica com o dobro da altura da AVL e tempos parecidos; ela chega a remover mais rápido porque não rebalanceia. A vantagem da AVL é garantir O(log n) também no pior caso.
- O array ordenado busca bem (busca binária), mas inserir e remover no meio desloca O(n) elementos.
- Em todas as medições a altura da AVL ficou abaixo do limite teórico de cerca de 1,44 · log₂ n.

## Limitações

- Um único ativo, com o livro apenas em memória: reiniciar o servidor apaga ordens e histórico.
- Só ordens limitadas; não há ordens a mercado, validade ou identificação de participantes.
