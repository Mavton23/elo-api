# ELO API

**ELO — Espaço de Ligação Operacional.** Plataforma interna, segura e unificada de comunicação e gestão de efetivos do Ministério do Interior de Moçambique.

API em **NestJS 11 + Prisma 7 + PostgreSQL**, com WebSockets (Socket.IO) para notificações em tempo real.

---

Guia de operação (instalação, cópias de segurança, acesso de emergência): **[docs/OPERACAO.md](docs/OPERACAO.md)**.

## Módulos

| Módulo | Função |
|---|---|
| `auth` | Registo validado contra a base pré-registada (NIP + BI + NUIT), login, 2FA (OTP por SMS/email ou app autenticadora), rotação de tokens |
| `members` | Perfis e pesquisa de efetivos |
| `hierarchy` | Estrutura orgânica (Direcção Nacional → Comandos → Unidades), organogramas, estatísticas |
| `social` | Publicações, comentários, gostos e marcadores, com **visibilidade por departamento, unidade, patente ou nível de segurança** |
| `notifications` | Comunicados com público-alvo (departamentos, patentes, províncias), confirmação de leitura, tempo real |
| `settings` | Preferências por utilizador |
| `admin` | Gestão de utilizadores, hierarquia, definições do sistema e registos de atividade |
| `help` | Centro de ajuda (artigos, FAQs, anexos) |
| `member-services` | **Prova de vida digital** (campanhas, selfie com código de desafio, fila de validação, taxa de cumprimento) e **atualização de dados** (contactos aplicados de imediato, restantes campos validados pelos RH com comprovativo) |

## Arranque rápido

```bash
cp .env.example .env               # preencher JWT_SECRET, REFRESH_TOKEN_SECRET, etc.
docker compose up -d db            # PostgreSQL local
pnpm install
pnpm prisma migrate deploy         # aplica as migrações
pnpm admin:create                  # cria o primeiro SUPER_ADMIN (variáveis SEED_ADMIN_*)
pnpm seed:hierarchy                # (opcional) estrutura orgânica inicial
pnpm start:dev
```

- API: `http://localhost:3000/api/v1`
- Documentação Swagger (fora de produção): `http://localhost:3000/api/v1/docs`
- Health check: `http://localhost:3000/health`

Produção (imagem Docker, utilizador sem privilégios, health check incluído):

```bash
docker compose up --build
```

## Segurança

| Controlo | Implementação |
|---|---|
| Registo | Só efetivos pré-registados pelo Ministério; NIP + BI + NUIT têm de coincidir |
| Senhas | bcrypt (12 rondas); mínimo 8 caracteres com maiúscula, minúscula e número |
| Bloqueio | Conta bloqueada após `MAX_LOGIN_ATTEMPTS` falhas (senha ou código 2FA) |
| 2FA | Obrigatório para oficiais (≥ Inspector), unidades sensíveis (UIR, UPAI, GOE), níveis de segurança altos, administradores e qualquer efetivo que ative um fator |
| 2FA sem terceiros | **Telemóvel de confiança** (assinatura Ed25519 de um desafio único; o servidor só guarda a chave pública), **TOTP** e **códigos de recuperação** (SHA-256, uso único). SMS/email só a pedido (`POST /auth/2fa/send-otp`) |
| Desafio 2FA | O login devolve um `challengeToken` assinado de 5 min; o cliente nunca envia o id do utilizador |
| Tokens | Access token de 15 min + refresh token de 7 dias, **rodado a cada utilização**; reutilização de um refresh token antigo revoga todas as sessões |
| Revogação imediata | `tokenVersion` por utilizador: logout, mudança de senha, desativação ou reset pelo admin invalidam todos os tokens no momento |
| Autorização | `req.user` recarregado da base de dados em cada pedido (patente, unidade, estado); rotas de administração exigem perfil admin ativo + permissão por módulo/ação |
| Validação | `ValidationPipe` global com whitelist (bloqueia mass-assignment) |
| Rate limiting | 120 pedidos/min por IP; 5/min nos endpoints de autenticação |
| Cabeçalhos | Helmet; CORS restrito a origens configuradas em produção |
| Auditoria | Todas as operações de escrita autenticadas ficam em `activity_logs` (quem, o quê, quando, IP), sem gravar o conteúdo |
| Anexos privados | Ficheiros dos posts, selfies e comprovativos guardados como privados no Cloudinary; a API devolve URLs assinadas que expiram em 1 hora |
| Erros | Formato único com `requestId`; nunca expõe stack traces em produção |
| Configuração | Variáveis validadas no arranque; a API recusa arrancar com segredos fracos ou em falta |

### Fluxo de verificação (2FA)

1. `POST /auth/login` → `{ requiresTwoFactor, challengeToken, methods: ['device','totp','recovery','otp'], deviceNonce }`
2. `POST /auth/verify-2fa-login` com um dos métodos:
   - `{ challengeToken, method: 'device', deviceId, signature }`: assinatura Ed25519 de `ELO-2FA-LOGIN:v1:<deviceNonce>`
   - `{ challengeToken, method: 'totp', code }`
   - `{ challengeToken, method: 'recovery', code }`
   - `{ challengeToken, method: 'otp', code }` (depois de `POST /auth/2fa/send-otp`)

Cada desafio é de uso único e um novo login invalida o anterior. Gestão: `GET /auth/2fa/status`, `POST /auth/2fa/devices`, `DELETE /auth/2fa/devices/:id`, `POST /auth/2fa/totp/setup|confirm|disable`, `POST /auth/2fa/recovery-codes` (todas as alterações exigem a senha).

### Sem acesso ao 2FA

| Situação | Solução |
|---|---|
| Efetivo perdeu o telemóvel | Usa um código de recuperação e regista o novo telemóvel |
| Efetivo perdeu tudo | Um administrador faz `POST /admin/users/:id/reset-2fa` (presencialmente) e entrega 10 novos códigos |
| O único administrador ficou sem acesso | No servidor: `pnpm admin:recovery-codes <NIP>` (fica registado na auditoria) |
| Desenvolvimento local | `AUTH_DEBUG_OTP=true` escreve o código no log da API |

### Criar o primeiro administrador

O pré-registo de membros (`POST /admin/add-member`) exige um administrador. Numa instalação nova, use:

```bash
SEED_ADMIN_NIP=... SEED_ADMIN_BI=... SEED_ADMIN_NUIT=... \
SEED_ADMIN_NAME="..." SEED_ADMIN_EMAIL=...@policia.gov.mz \
SEED_ADMIN_PASSWORD='...' pnpm admin:create
```

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm start:dev` | Desenvolvimento com recarregamento automático |
| `pnpm build` / `pnpm start:prod` | Compilar / executar em produção |
| `pnpm typecheck` | Verificação de tipos |
| `pnpm test` | Testes unitários |
| `pnpm test:e2e` | Testes ponta a ponta contra uma base de dados real (`DATABASE_URL`) |
| `pnpm prisma:migrate` | Criar nova migração (desenvolvimento) |
| `pnpm prisma:deploy` | Aplicar migrações (produção) |
| `pnpm admin:create` | Criar/promover SUPER_ADMIN (mostra 10 códigos de recuperação) |
| `pnpm admin:recovery-codes <NIP>` | Acesso de emergência: novos códigos de recuperação |
| `pnpm seed:hierarchy` | Estrutura orgânica inicial |

## Alterações que afetam a app móvel

- Prefixo global: todas as rotas passam a `/api/v1/...` (exceto `/health`).
- `POST /auth/login` devolve `challengeToken` (em vez de `userId`) quando é necessário 2FA.
- `POST /auth/verify-2fa-login` recebe `{ challengeToken, code }`.
- Removidos `login/nip`, `login/bi`, `login/nuit`, `login/email` (usar `login` ou `login/generic`) e os placeholders de recuperação de senha. A recuperação é feita pelo administrador.
- WebSocket: token apenas em `auth.token` ou no cabeçalho `Authorization`.

## Serviços ao efetivo

### Prova de vida

1. O administrador (RH) abre uma campanha (`POST /admin/life-proof/campaigns`), opcionalmente limitada a departamentos/províncias.
2. Na app, o efetivo pede um código (`POST /life-proof/challenge`), escreve-o num papel e tira uma selfie com a câmara frontal a segurá-lo.
3. A app envia selfie + código assinado + localização (`POST /life-proof`). O código expira em 10 minutos, o que impede reutilizar fotografias antigas.
4. O revisor vê a selfie, o código esperado, a localização e a última selfie aprovada para comparar, e aprova ou rejeita com motivo (`PATCH /admin/life-proof/:id/review`). O efetivo é notificado.
5. `GET /admin/life-proof/campaigns/:id/compliance` mostra quantos efetivos abrangidos já cumpriram.

### Atualização de dados

| Campo | Política |
|---|---|
| Telefone pessoal, morada, contacto de emergência | Aplicado de imediato |
| Telefone de serviço, email institucional, especialidade | Validação pelos RH |
| Estado civil, cursos adicionais | Validação pelos RH + comprovativo obrigatório |
| Nome, NIP, BI, NUIT, patente, unidade, etc. | Não editável por pedido (só por ato administrativo) |

Cada pedido guarda o valor anterior e o novo, quem decidiu e quando. A aprovação atualiza também a base pré-registada (`Member`).
