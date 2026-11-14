# Cabinet médical — conteneurisation locale

Application académique développée en équipe avec React, TypeScript, Express et MySQL. **Ma contribution DevOps** porte sur la conteneurisation, la configuration locale, les contrôles de santé, la persistance et les vérifications de démarrage. Ce dépôt n'est pas le pipeline réutilisable du PFA.

## Ce qui a été réalisé

- `Dockerfile` multistage : installation reproductible avec `npm ci`, compilation du frontend et image d'exécution Node.
- `compose.yaml` : application et MySQL sur un réseau de données interne ; seul le frontend/API est exposé sur `127.0.0.1:18082`.
- Configuration externalisée dans `.env` généré localement par `deploy/prepare-env.sh` : secrets aléatoires et références d'images fixées par digest. Le fichier `.env` n'est pas versionné.
- MySQL sur volume nommé ; healthchecks, attente de la base, processus Node non root et limites sur les journaux.
- Tests de fonctionnement HTTP et de persistance après redémarrage dans `deploy/`.

Des correctifs applicatifs minimaux étaient nécessaires pour rendre cette démonstration exécutable : initialisation transactionnelle des données de démonstration, route de repli Express 5 et inscription patient confirmée seulement après réponse de la base. La création publique d'un rôle administrateur est refusée.

## Démarrage local

Prérequis : Docker Desktop avec intégration WSL, Docker Compose, Bash et OpenSSL. Depuis la racine du projet :

```bash
bash deploy/prepare-env.sh  # une seule fois : conserve ensuite .env
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 300
docker compose ps
```

Ouvrir [http://localhost:18082](http://localhost:18082). Le frontend et l'API sont servis par le même conteneur. MySQL n'a pas de port publié ; ses données sont conservées dans `cabinet-medical_mysql_data`.

## Vérifications

```bash
docker compose exec -T app id -u
docker compose exec -T -e CABINET_URL=http://127.0.0.1:3001 app \
  node --input-type=module < deploy/smoke.mjs
bash deploy/verify-persistence.sh
```

Résultats observés localement le 14 novembre 2026 : conteneurs `app` et `mysql` **healthy**, UID applicatif `1000`, test HTTP réussi pour la page, la disponibilité MySQL, la connexion de démonstration, les rendez-vous, l'inscription/connexion d'un patient et le refus d'une création d'administrateur sans autorisation. Le test de persistance a conservé son marqueur après redémarrage de l'application et de MySQL. Il s'agit de vérifications locales ; elles ne constituent pas une validation de production ni un audit complet de sécurité ou des parcours métier.

## Reprise et données

```bash
docker compose stop
docker compose up -d --wait --wait-timeout 300
```

`docker compose down` conserve le volume MySQL. **Ne pas ajouter `-v`** si les données doivent être préservées. Conserver `.env` en lieu privé : les identifiants MySQL créés au premier démarrage ne changent pas simplement parce que ce fichier est régénéré. Le schéma SQL n'est exécuté automatiquement que lors de l'initialisation d'un volume vide.

L'application fournit des comptes et données de **démonstration**. Ne saisir aucune donnée médicale réelle et ne pas exposer ce service sur Internet. Le code métier est celui d'un projet académique ; ses contrôles d'autorisation ne sont pas adaptés à un déploiement public. Aucun service AWS, Kubernetes ou pipeline CI/CD n'est requis pour cette contribution.

Le document historique `SETUP_GUIDE.md` décrit le lancement manuel de l'application ; ce README décrit la configuration Docker. Les sauvegardes locales `*.avant-correctif`, le fichier `.env`, les dépendances et les fichiers compilés sont exclus de Git.
