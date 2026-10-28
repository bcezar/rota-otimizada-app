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
| **Endereços** | Livro de endereços completo (lista em cards, busca com autocomplete, detalhe com nome do local, notas, cliente, tags). Validado. Só local (AsyncStorage). |
| **Otimizar** | Tela principal de montagem de rota: Ponto de Partida, Destino Final, Adicionar parada, lista de paradas em cards com contador, botão Otimizar. Validado. |
| **Importar** | Importação CSV/XLS com preview e template. Validado. |
| **Conta** | Perfil, plano, upgrade (Asaas PIX/cartão/cupom), preferências sincronizadas com o backend, FAQ, fale conosco, sobre, excluir conta (aviso), sair. Validado. |
| Fluxo de adicionar parada | Busca por texto, Mapa, Lote, Lista de endereços (com switch), Importar. Validado. |
| Detalhe da parada | Mesmas seções do endereço salvo (nome, notas, cliente, tags), aplicadas à parada da rota. Validado. |
| Resultado | Lista ordenada, visitada/pulada, Google Maps, compartilhar, copiar. Validado. |
| Login | Magic link legado (`/auth/login`), sessão em SecureStore. Validado. |

## Decisões importantes

- **Dev workflow:** tudo é testado no **Expo Go** (iOS Simulator). Isso
  impede bibliotecas com código nativo customizado, como reconhecimento de
  voz. Ver "Pendências".
- **Backend local** (`../rota-otimizada`): rodar com
  `.venv/bin/uvicorn app.main:app --reload --port 8000`. O `.env` local aponta
  para o banco Turso de produção.
- **Dados locais vs. backend:**
  - Preferências: sincronizadas com o backend (`GET`/`PUT /api/v1/users/preferences`).
  - Lista de paradas, livro de endereços: só AsyncStorage (sem endpoint no backend).
- **Ordem da tab Navegação:** mapa, polyline, pins, painel da rota e modo de
  acompanhamento implementados; confirmar o fluxo no simulador antes de marcar
  como validado.

## Pendências

**Prioridade imediata:**
1. Corrigir a visualização dos cards na tela **Ajustar ordem**. O usuário relata
   que o drag and drop está presente, mas a área da lista parece cortada ou
   colapsada no simulador. Deixar este item anotado e retomar depois.

**Para depois:**
- Persistir o livro de endereços no backend Python (atualmente os dados ficam
  apenas no AsyncStorage do app). O usuário autorizou trabalhar na pasta irmã do
  backend quando esta tarefa for retomada.
- Planejar a exclusão de conta separadamente. É uma área sensível; não iniciar
  implementação antes de uma discussão própria de escopo e fluxo.

**Adiadas:**
- Reconhecimento de voz no campo de endereço. Alternativa simples: usar a
  ditagem por voz do teclado do sistema, que preenche o TextInput sem código
  nativo específico. Reconhecimento embutido no app pode ser avaliado depois;
  bibliotecas nativas requerem development build em vez do Expo Go.
- Exportar paradas para CSV (existe no site, não portado).
- Rotas salvas: plano futuro para reusar rotas com menos passos.
- Notificações push e Live Activities: plano futuro.
- Biometria para acesso: boa possibilidade futura, ainda sem plano definido.
- i18n/idiomas: fora do escopo por enquanto.
- Modo offline.

## Problemas conhecidos

- **Mapa lento no simulador** ao carregar tiles. Foi aceito como custo do
  simulador (já observado no seletor de mapa). Deve melhorar em dispositivo real.
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
