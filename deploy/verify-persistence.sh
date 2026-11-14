#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Dedicated marker; never removes business data.
query() {
  docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u cabinet_app cabinet_medical --batch --skip-column-names' 
}
marker="persistence-$(date +%s)-$RANDOM"
printf "CREATE TABLE IF NOT EXISTS devops_persistence_probe (id VARCHAR(80) PRIMARY KEY); INSERT INTO devops_persistence_probe VALUES ('%s');\n" "$marker" | query
docker compose restart mysql app
docker compose up -d --wait --wait-timeout 240
result=$(printf "SELECT id FROM devops_persistence_probe WHERE id='%s';\n" "$marker" | query)
[[ $result == "$marker" ]]
printf "DELETE FROM devops_persistence_probe WHERE id='%s';\n" "$marker" | query
echo 'PASS marker preserved after MySQL/application restart'
