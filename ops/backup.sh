#!/usr/bin/env bash
# Cópia diária da base de dados do ELO (agendar com cron às 02:15).
#   15 2 * * * /opt/elo/ops/backup.sh >> /var/log/elo-backup.log 2>&1
# Requer: pg_dump, gpg (cifra com a chave pública do serviço), e um destino FORA do servidor.
set -euo pipefail

: "${DATABASE_URL:?defina DATABASE_URL}"
: "${BACKUP_DIR:=/var/backups/elo}"
: "${BACKUP_GPG_RECIPIENT:?defina BACKUP_GPG_RECIPIENT (chave pública de cifra)}"
: "${BACKUP_RETENTION_DAYS:=30}"

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$BACKUP_DIR/elo-$stamp.dump.gpg"

pg_dump --format=custom --no-owner "$DATABASE_URL" | gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" -o "$file"
sha256sum "$file" > "$file.sha256"
echo "$(date -u +%FT%TZ) cópia criada: $file ($(du -h "$file" | cut -f1))"

# Envio para o destino externo (ajuste ao meio disponível: rsync para servidor do Ministério, armazenamento S3 compatível, etc.)
if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  rsync -a "$file" "$file.sha256" "$BACKUP_REMOTE/"
  echo "enviada para $BACKUP_REMOTE"
fi

find "$BACKUP_DIR" -name 'elo-*.dump.gpg*' -mtime +"$BACKUP_RETENTION_DAYS" -delete
