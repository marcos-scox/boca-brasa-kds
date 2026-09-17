# Boca & Brasa — Cardápio Digital + KDS

Aplicação web responsiva para uma lanchonete, com cardápio digital para pedidos feitos pela mesa, acompanhamento de status em tempo real, painel da cozinha e configuração do WhatsApp.

## Links

- **Site publicado:** [Abrir o site](manus-webdev://adb6cc9d)
- **GitHub Pages:** [marcos-scox.github.io/boca-brasa-kds](https://marcos-scox.github.io/boca-brasa-kds/)
- **Repositório público:** [github.com/marcos-scox/boca-brasa-kds](https://github.com/marcos-scox/boca-brasa-kds)

O GitHub Pages publica a versão estática do front-end. Para pedidos persistentes, painel da cozinha e sincronização em tempo real com banco de dados, use o [site completo publicado](manus-webdev://adb6cc9d).

## Funcionalidades

### Cardápio do cliente

- Identificação da mesa pelo parâmetro `?mesa=04` ou por digitação manual.
- Categorias de hambúrgueres, lanches, salgados e bebidas.
- Carrinho com controle de quantidade, subtotal e total.
- Finalização do pedido com persistência no banco de dados.
- Abertura automática do WhatsApp com o resumo do pedido.
- Acompanhamento do pedido em três etapas: recebido, em preparo e pronto.

### Painel da cozinha

- Lista de pedidos ativos atualizada automaticamente a cada 3 segundos.
- Menu lateral com acesso aos pedidos, configuração e QR Codes por mesa.
- Cartões com mesa, horário, itens, quantidades e valor total.
- Busca rápida por número da mesa.
- Ações para iniciar o preparo, concluir e marcar como entregue.
- Cores diferentes para cada status.
- Alerta sonoro opcional para novos pedidos.

### Painel administrativo

- Cadastro do número de WhatsApp oficial que receberá os pedidos.
- Validação do número no formato internacional, usando apenas dígitos.
- Geração de QR Code individual para cada mesa.
- Cada QR Code abre o cardápio já identificado com `?mesa=N`.
- O cardápio não permite digitar a mesa manualmente: ela vem do QR Code.
- O cliente acompanha a mesa e o status do pedido pelo botão de acompanhamento.

## Rotas

| Rota | Uso |
| --- | --- |
| `/` | Cardápio digital do cliente |
| `/?mesa=04` | Cardápio já identificado para a mesa 04 |
| `/cozinha` | Painel da cozinha/KDS |
| `/admin` | Configuração do WhatsApp |
| `/config` | Atalho alternativo para configurações |

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Express + tRPC
- Drizzle ORM
- MySQL/TiDB
- Vitest
- Manus WebDev

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

Verificações disponíveis:

```bash
pnpm check
pnpm test
pnpm build
```

A aplicação usa as variáveis de ambiente fornecidas pelo ambiente WebDev, incluindo `DATABASE_URL` para persistência dos pedidos e configurações.

## Modelo de dados

A aplicação mantém três estruturas principais:

- `users`: usuários do fluxo opcional de autenticação.
- `orders`: pedidos, itens serializados, mesa, total, status e horário de criação.
- `settings`: configurações persistentes, incluindo o número de WhatsApp.

## Status do projeto

Projeto funcional e responsivo, com fluxo de pedido validado no navegador, build de produção concluído e código publicado em um repositório público.
