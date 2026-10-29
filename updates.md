# Rota Otimizada — App mobile: status atual

Última atualização: 2026-10-28

## Onde paramos

As funcionalidades principais da aba **Navegação** foram aceitas pelo usuário.
A única prioridade imediata em aberto é corrigir a visualização dos cards na
tela **Ajustar ordem**; o usuário confirmou que os demais itens imediatos estão
ok.

## Telas e abas

| Aba / tela | Estado |
|---|---|
| **Navegação** | Mapa com localização atual, polyline da rota e pins numerados; painel com três níveis (15%, 50% e nível chamado 96%, com altura visual de 90%), arrastável pelo puxador com transição animada. No nível compacto mostra a parada ativa/próxima com ações; nos demais, lista rolável. Selecionar uma parada durante a navegação centraliza o mapa na parte visível; selecionar com o painel no nível 96% mantém esse nível. Menu inclui reiniciar, inverter, ajustar ordem e cancelar a rota. Implementado em 2026-10-28, ainda precisa validação visual no simulador. |
| **Endereços** | Livro de endereços completo (lista em cards, busca com autocomplete, detalhe com nome do local, notas, cliente, tags). Visitante mantém dados locais; usuários autenticados sincronizam com o backend e acessam a lista em outros dispositivos. Exclusões usam tombstones para sincronização offline. |
| **Otimizar** | Tela principal de montagem de rota: Ponto de Partida, Destino Final, Adicionar parada, lista de paradas em cards com contador, botão Otimizar. Validado. |
| **Importar** | Importação CSV/XLS com preview e template. Validado. |
| **Conta** | Perfil, plano, upgrade (Asaas PIX/cartão/cupom), preferências sincronizadas com o backend, FAQ, fale conosco, sobre, fluxo de exclusão e sair. |
| Fluxo de adicionar parada | Busca por texto, Mapa, Lote, Lista de endereços (com switch), Importar. Validado. |
| Detalhe da parada | Mesmas seções do endereço salvo (nome, notas, cliente, tags), aplicadas à parada da rota. Validado. |
| Resultado | Lista ordenada, visitada/pulada, Google Maps, compartilhar, copiar. Validado. |
| Login | Magic link por e-mail com retorno móvel por deep link e troca de código temporário; callback ainda depende de development build para validar. Login provisório sem magic link disponível apenas em desenvolvimento e bloqueado por padrão no backend. |

## Decisões importantes

- **Dev workflow atual:** app testado no **Expo Go** (iOS Simulator). Expo Go
  não valida por completo callbacks de deep link com scheme estável nem splash
  nativo; usar development/preview build para esses fluxos e assets.
- **Backend local** (`../rota-otimizada`): rodar com
  `.venv/bin/uvicorn app.main:app --reload --port 8000`. O `.env` local aponta
  para o banco Turso de produção.
- **Dados locais vs. backend:**
  - Preferências: sincronizadas com o backend (`GET`/`PUT /api/v1/users/preferences`).
  - Lista de paradas: AsyncStorage.
  - Livro de endereços: backend por conta autenticada e cache local para uso offline.
- **Ordem da tab Navegação:** mapa, polyline, pins, painel da rota e modo de
  acompanhamento implementados; confirmar o fluxo no simulador antes de marcar
  como validado.
- **Acesso sem conta:** visitante tem até 5 otimizações bem-sucedidas por dia,
  com janela UTC. Regra aplicada no app, backend e site. A cota usa um ID
  anônimo persistido por instalação/navegador e é contada no backend (Turso;
  fallback em memória). Conta gratuita não tem cota diária e mantém limite de
  5 paradas por rota; Pro permite 50. Apagar os dados do app/navegador ou
  reinstalar gera outro ID anônimo.
- **Livro de endereços:** CRUD por usuário no backend e sincronização do app
  implementados. Primeiro login mescla o cache local com a lista da conta por
  ID; vence a versão com `updatedAt` mais recente. Endereços repetidos não são
  deduplicados. O app mantém cache offline e sincroniza tombstones de exclusão.
- **Rotas salvas:** integração móvel com os endpoints existentes do backend.
  Salvar pelo menu da rota, listar/excluir na tela Rotas salvas e reutilizar uma
  rota recalculando o trajeto. Inclui metadados das paradas. A tabela existente
  `saved_routes` é reutilizada; validar o fluxo no simulador.

## Pendências

**Prioridade imediata:**
1. Corrigir a visualização dos cards na tela **Ajustar ordem**. O usuário relata
   que o drag and drop está presente, mas a área da lista parece cortada ou
   colapsada no simulador. Deixar este item anotado e retomar depois.

**Para depois:**
- **Excluir conta — implementado com reembolso; revisão jurídica pendente:**
  app e web mostram o valor estimado, enviam link de confirmação ao e-mail e
  cancelam renovações antes de remover a conta. Dentro de 7 dias da contratação
  online, solicitam reembolso integral quando aplicável; depois desse prazo,
  calculam o valor proporcional ao tempo pago restante. A remoção aguarda a
  confirmação do estorno assíncrono do Asaas; estados de erro mantêm a conta e
  permitem nova tentativa. O fluxo remove dados de rotas/endereço/sessões e
  anonimiza feedback, contato e identificadores de cupom. O FAQ do app e do site
  foi atualizado. O fluxo fica desativado por padrão (`ACCOUNT_DELETION_ENABLED=false`)
  para impedir exclusões acidentais enquanto o backend local usa o Turso de
  produção; ativar apenas em ambiente isolado de teste. **Pendente:** revisar a regra para renovações, retenção legal
  de dados de cobrança e texto final com os insumos jurídicos do usuário; ajustar
  o FAQ e os termos após essa análise.
- **Splash e ícone — implementados:** símbolo de rota baseado na referência,
  ícone claro de 1024×1024, camadas foreground/monochrome para Android,
  favicon e splash nativo com fundo claro pelo plugin `expo-splash-screen`.
  Validar a aparência final em builds instaladas de iOS e Android; Expo Go não
  reproduz o splash nativo do app.
- **Tema claro/escuro — futuro:** incluir nas Configurações uma escolha entre
  tema claro e escuro. Aplicar a escolha globalmente ao app; persistir localmente
  para visitantes e sincronizar com as preferências do backend para contas
  autenticadas. Considerar mapas, status bar, modais e demais superfícies para
  manter contraste e legibilidade nos dois temas.

**Adiadas:**
- Reconhecimento de voz no campo de endereço. Alternativa simples: usar a
  ditagem por voz do teclado do sistema, que preenche o TextInput sem código
  nativo específico. Reconhecimento embutido no app pode ser avaliado depois;
  bibliotecas nativas requerem development build em vez do Expo Go.
- Exportar paradas para CSV (existe no site, não portado).
- Notificações push e Live Activities: plano futuro.
- Biometria para acesso: boa possibilidade futura, ainda sem plano definido.
- i18n/idiomas: fora do escopo por enquanto.
- Modo offline.

## Problemas conhecidos

- **Mapa lento no simulador** ao carregar tiles. Foi aceito como custo do
  simulador (também observado no seletor). As telas Navegação e Mapa para
  adicionar parada agora montam o mapa imediatamente na região padrão e
  centralizam na localização assim que ela chega; no seletor, se o usuário
  começar a mover o mapa, a localização não rouba o foco. Ainda falta validar
  visualmente no simulador.
  No iOS, o app usa o MapKit/Apple Maps padrão; a chave Google da web/backend
  não está configurada como chave do SDK nativo de mapas no app.
- **Dependências:** `npm install` costuma exigir `--legacy-peer-deps` por
  conflito de peer entre `react-dom` e `react` (SDK 57). Ao instalar pacotes
  Expo, usar `npx expo install` e, se falhar, o workaround acima.
- **expo-file-system:** no SDK 57, as APIs antigas estão em
  `expo-file-system/legacy`. Usar esse import.

## Como rodar

```bash
# Terminal 1 — backend
cd ../rota-otimizada && .venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2 — app
cd rota-otimizada-app && npx expo start --ios
```
