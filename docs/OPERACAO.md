# ELO — Guia de operação

Para a equipa técnica que mantém o servidor. Linguagem simples, passos verificáveis.

## 1. Instalar ou atualizar

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy      # aplica migrações pendentes (idempotente)
pnpm build
pnpm seed:help                  # publica/atualiza guias e perguntas frequentes (idempotente)
pm2 restart elo-api             # ou o gestor de processos em uso
```

Antes de uma atualização com migrações: **ative o modo de manutenção** na app
(Administração › Sistema › Modo de manutenção) e faça uma cópia de segurança manual (secção 3).

## 2. Variáveis obrigatórias

`DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (≥ 32 caracteres, diferentes entre si),
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CORS_ORIGINS`.
Nunca coloque `.env` em repositórios nem em arquivos enviados por email. Ao suspeitar de fuga, **rode as chaves** e
force a saída de todos (`UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1;`).

## 3. Cópias de segurança

A app **não** faz cópias de segurança — são responsabilidade da infraestrutura.

- Script: `ops/backup.sh` (pg_dump cifrado com GPG, soma SHA-256, envio para destino externo, retenção de 30 dias).
- Agendamento: diário, `cron` às 02:15.
- Regra 3-2-1: 3 cópias, 2 meios diferentes, 1 fora do edifício do servidor.
- **Teste de reposição mensal** num servidor de ensaio:

```bash
gpg -d elo-AAAAMMDDTHHMMSSZ.dump.gpg > elo.dump
createdb elo_ensaio && pg_restore --no-owner -d elo_ensaio elo.dump
```

Registe a data de cada teste. Uma cópia que nunca foi reposta não é uma cópia.

## 4. Acesso de emergência (administrador sem segundo fator)

```bash
pnpm admin:recovery-codes <NIP>
```

Emite 10 códigos de recuperação novos (os anteriores deixam de valer) e regista o evento na auditoria
como "Códigos de recuperação emitidos no servidor". Entregue os códigos em papel, presencialmente.

## 5. Políticas aplicadas pelo sistema

Configuráveis em Administração › Sistema, com efeito imediato (até 15 s):

| Política | Onde é aplicada |
|---|---|
| Tentativas de senha antes do bloqueio e duração | `AuthService.registerFailedAttempt` |
| Modo de manutenção (503 `MAINTENANCE` para não-administradores) | `MaintenanceInterceptor` |

Na conta de cada efetivo (Definições): visibilidade do perfil, contactos de serviço, aviso de nova entrada, vibração.

## 6. Auditoria

Todas as ações que alteram dados, entradas, senhas erradas e bloqueios ficam em `activity_logs`
(consultáveis em Administração › Auditoria). Não há interface para apagar registos.
Retenção recomendada: 5 anos, com exportação anual para arquivo.

## 7. Verificação rápida depois de uma atualização

```bash
curl -s https://<servidor>/health          # {"status":"ok"...}
pnpm test:e2e                               # num ambiente de ensaio, nunca em produção
```
