# Painel DIN · FUNPEC

Painel executivo da Diretoria de Inovação e Novos Negócios da FUNPEC. Site estático (HTML, CSS e JavaScript, sem servidor), publicado pelo GitHub Pages.

## Seções

| Aba | O que mostra | De onde vêm os dados |
|---|---|---|
| Visão geral | Frentes de atuação, agenda dos próximos 21 dias e prioridades | Jira (`data/jira.js`) |
| Atividades | Quadro e lista dos cards, com filtros por frente, responsável e prazo | Jira |
| Rede e matching | Grafo de parceiros com filtros de maturidade, tipo, área e interesse; matching de parceiros para um projeto ou edital | `data/parceiros.js` + `data/portfolio_mineral.js` + `data/labs.js` |
| Pipeline | Parceiros por estágio da relação, com situação e próximo passo | `data/parceiros.js` |
| Indicadores | Os 30 indicadores pactuados, com lançamento do realizado | `data/indicadores.js` |
| Equipe e rotina | Cards por responsável, rotina semanal e pauta do kickoff | Jira |

A versão anterior (só indicadores) foi mantida em `legado-indicadores.html`.

## Atualização automática do Jira

A Action `.github/workflows/sync.yml` roda nos dias úteis às 7h17 (Natal) e também pode ser disparada à mão em **Actions → Sincronizar Jira e laboratórios → Run workflow**. Ela:

1. exporta os cards do projeto NEIF com a etiqueta `plano-nov2026` para `data/jira.js`;
2. copia `embedded_data.js` do repositório `labs` para `data/labs.js`;
3. faz commit se algo mudou.

Para o passo 1 funcionar, cadastre dois segredos em **Settings → Secrets and variables → Actions**:

- `JIRA_EMAIL`: o e-mail da conta Atlassian
- `JIRA_API_TOKEN`: token criado em https://id.atlassian.com/manage-profile/security/api-tokens

O token fica só nos segredos do GitHub. O site publicado recebe apenas o arquivo gerado.

## Convenções no Jira

- Frente: etiqueta `frente-captacao`, `frente-pdi`, `frente-parcerias`, `frente-portfolio`, `frente-dados`, `frente-ict`, `frente-institucional`, `frente-programas` ou `frente-gestao`.
- Responsável: `resp-diretor`, `resp-gerente` ou `resp-analista`.
- Marcadores: `prioridade-alta`, `heranca` (demanda herdada), `rotina`, `estrutura`.

## Como incluir ou atualizar um parceiro

Edite `data/parceiros.js`. Cada parceiro tem `maturidade` (1 a 4), `tipo`, `areas`, `interesses`, `papeis`, `editais`, `situacao`, `proximo` e os cards do Jira relacionados. Para ligar parceiros entre si no grafo, inclua o projeto em `window.PROJETOS`. Os laboratórios entram automaticamente a partir do repositório `labs`.

## Como o matching funciona

O texto do projeto ou edital é lido para identificar setor, financiador e termos técnicos. Só entra no resultado quem tem aderência temática: área em comum, pelo menos dois termos técnicos em comum (campo `palavras` dos parceiros) ou, para financiadores, o financiador citado. Áreas valem mais quando o parceiro é especializado. Interesse genérico, maturidade da relação e potencial deep tech apenas ordenam quem já é aderente. Quando ninguém é aderente, o painel aponta a lacuna na rede. As opções "exige empresa", "exige ICT" e "busca investidor" reforçam o papel correspondente. O resultado é agrupado por papel no projeto e sugere um arranjo inicial; ele apoia a decisão e não substitui a avaliação técnica.

## Publicação

**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
