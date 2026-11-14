# 🏥 Guide d'Installation — Cabinet Médical (Full-Stack)

## Architecture

```
┌──────────────┐    HTTP/REST     ┌──────────────────┐    SQL     ┌─────────┐
│   Frontend   │ ───────────────► │   Backend API    │ ─────────► │  MySQL  │
│   React SPA  │ ◄─────────────── │   Express.js     │ ◄───────── │  8.0    │
│   :5173/:3001│    JSON + JWT    │   :3001          │  Results   │  :3306  │
└──────────────┘                  └──────────────────┘            └─────────┘
```

---

## 1. Prérequis

| Outil | Version |
|-------|---------|
| Node.js | 18+ |
| MySQL Server | 8.0 |
| npm | 9+ |

---

## 2. Installation Rapide (3 étapes)

### Étape 1 — Base de données MySQL

```bash
# Se connecter à MySQL
mysql -u root -p

# Créer la base + importer le schéma
source database/schema.sql;
exit;
```

### Étape 2 — Configuration

Le fichier `.env` est déjà configuré avec les valeurs par défaut :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cabinet_medical
DB_USER=root
DB_PASS=         # ← Mettre votre mot de passe MySQL ici
PORT=3001
JWT_SECRET=cabinet-medical-jwt-secret-2025-ChangeInProd
```

### Étape 3 — Lancer le serveur

```bash
# Installer les dépendances (déjà fait)
npm install

# Lancer le backend Express (sert aussi le frontend)
node server/index.js
```

Ouvrir → **http://localhost:3001**

> Le serveur auto-seed la base avec les comptes démo au premier démarrage.

---

## 3. Développement (Frontend + Backend séparés)

```bash
# Terminal 1 — Backend
node server/index.js
# → http://localhost:3001/api

# Terminal 2 — Frontend (Hot Reload)
npm run dev
# → http://localhost:5173 (appelle l'API sur :3001)
```

### Build Production

```bash
npm run build          # Génère dist/index.html
node server/index.js   # Sert dist/ + /api sur :3001
```

---

## 4. Comptes de Démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| **Admin** | admin@cabinet.fr | admin123 |
| **Médecin** | dupont@cabinet.fr | doctor123 |
| **Médecin** | martin@cabinet.fr | doctor123 |
| **Secrétaire** | marie@cabinet.fr | secret123 |
| **Patient** | ahmed@email.com | patient123 |
| **Patient** | sophie@email.com | patient123 |
| **Patient** | karim@email.com | patient123 |

> Les mots de passe sont hachés avec bcrypt dans MySQL.

---

## 5. API Endpoints

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|:----:|
| `POST` | `/api/auth/login` | Connexion → JWT token | ❌ |
| `GET` | `/api/users?role=` | Liste utilisateurs | ✅ |
| `GET` | `/api/users/:id` | Détail utilisateur | ✅ |
| `POST` | `/api/users` | Créer un utilisateur | ❌* |
| `PUT` | `/api/users/:id` | Modifier un utilisateur | ✅ |
| `DELETE` | `/api/users/:id` | Supprimer un utilisateur | ✅ |
| `GET` | `/api/appointments?doctorId=&date=` | Liste RDV | ✅ |
| `POST` | `/api/appointments` | Créer un RDV | ✅ |
| `PUT` | `/api/appointments/:id` | Modifier un RDV | ✅ |
| `DELETE` | `/api/appointments/:id` | Supprimer un RDV | ✅ |
| `GET` | `/api/consultations?patientId=` | Liste consultations | ✅ |
| `POST` | `/api/consultations` | Créer une consultation | ✅ |

\* La création de compte patient est publique (inscription).

---

## 6. Structure du Projet

```
server/                    # ← Backend Express
├── index.js               # Point d'entrée (Express + static)
├── db.js                  # Pool MySQL + seed + helpers
├── middleware.js           # JWT auth + rôle guard
└── routes.js              # Toutes les routes API

database/
└── schema.sql             # Schéma MySQL (auto-seed par le serveur)

src/                       # ← Frontend React
├── shared/
│   ├── store.ts           # API + cache mémoire (plus de LocalStorage!)
│   ├── auth.tsx           # Context JWT asynchrone
│   ├── types.ts           # Types TypeScript
│   └── logger.ts          # Logging asynchrone
├── features/              # Pages par rôle
│   ├── auth/LoginPage.tsx
│   ├── admin/AdminDashboard.tsx
│   ├── patient/PatientDashboard.tsx
│   ├── secretary/SecretaryDashboard.tsx
│   └── doctor/DoctorDashboard.tsx
└── components/Layout.tsx
```

---

## 7. Résolution des Problèmes

| Problème | Solution |
|----------|----------|
| `❌ Failed to start server` | Vérifier que MySQL tourne : `sudo systemctl start mysql` |
| `ER_ACCESS_DENIED_ERROR` | Modifier `DB_USER`/`DB_PASS` dans `.env` |
| `ER_BAD_DB_ERROR` | Exécuter `mysql -u root -p < database/schema.sql` |
| Page blanche "Connexion au serveur..." | Démarrer le backend : `node server/index.js` |
| CORS error en dev | Vérifier que le backend tourne sur le port 3001 |
