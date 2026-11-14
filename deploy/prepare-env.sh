#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ ! -e .env ]] || { echo '.env already exists; preserved.'; exit 1; }
command -v openssl >/dev/null
docker info >/dev/null
# Reviewed major lines; lock exact registry digests on first setup.
docker pull node:22-bookworm-slim
docker pull mysql:8.4
node_ref=$(docker image inspect node:22-bookworm-slim --format '{{index .RepoDigests 0}}')
mysql_ref=$(docker image inspect mysql:8.4 --format '{{index .RepoDigests 0}}')
[[ $node_ref =~ @sha256:[a-f0-9]{64}$ && $mysql_ref =~ @sha256:[a-f0-9]{64}$ ]]
umask 077
(set -o noclobber
cat > .env <<EOF
NODE_IMAGE=$node_ref
MYSQL_IMAGE=$mysql_ref
MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
CABINET_HTTP_PORT=18082
EOF
)
echo '.env created (mode 600). No secret printed. Keep it for subsequent starts.'
