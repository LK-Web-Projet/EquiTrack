# EquiTrack

Application de gestion et de suivi d'équipements pour entreprise : catalogue par catégories, prêts/retours aux employés, incidents, maintenances, photos, historique et rapports.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **PostgreSQL** self-hosted + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- Authentification maison : **JWT** (cookie httpOnly, 7 jours) + **bcrypt**
- Stockage des photos d'équipement sur disque (volume Docker en prod), servi via une route API protégée par l'authentification
- **Tailwind CSS v4**, **Zustand** (état UI uniquement), **jsPDF** (rapports), **date-fns** (locale FR)
- **Anthropic SDK** pour deux fonctionnalités IA optionnelles (actuellement masquées, voir plus bas)

L'application ne dépend d'aucun service tiers géré (pas de Supabase, pas d'auth SaaS) : tout tourne sur un Postgres classique.

## Démarrage local

### 1. Prérequis

- Node.js 20+
- Un Postgres 16 accessible (local, Docker, ou distant)

### 2. Configuration

Copier `.env.local.example` en `.env.local` et renseigner :

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion Postgres, utilisée par Prisma CLI et par l'app au runtime |
| `JWT_SECRET` | Secret de signature des sessions — une valeur aléatoire longue, différente par environnement |
| `UPLOADS_DIR` | Dossier de stockage des photos d'équipement, **hors de `public/`** (ex. `./data/uploads` en local, un volume Docker nommé en prod) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Premier compte admin, créé par `npm run db:seed` |
| `ANTHROPIC_API_KEY` | Optionnel — nécessaire uniquement si les fonctionnalités IA sont réactivées |

### 3. Installation et base de données

```bash
npm install
npx prisma migrate deploy   # crée les tables sur DATABASE_URL
npm run db:seed             # crée le premier compte admin
npm run dev
```

L'app est disponible sur `http://localhost:3000`. Se connecter avec les identifiants `SEED_ADMIN_*`.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm run start` | Build et exécution en production |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Crée/applique une migration Prisma en dev (`prisma migrate dev`) |
| `npm run db:generate` | Régénère le client Prisma après modification du schéma |
| `npm run db:studio` | Interface Prisma Studio |
| `npm run db:seed` | Crée/rétablit le premier compte admin (idempotent) |
| `npm run db:backup` | Exporte toutes les données (hors mots de passe) vers `backups/backup-<date>.json` |
| `npm run db:reset -- --yes` | Vide les données métier (garde les comptes utilisateurs) — sans `--yes`, affiche un aperçu sans rien supprimer |

## Architecture

### Authentification

- `src/lib/auth/jwt.ts` / `hash.ts` : signature JWT (HS256) et hachage bcrypt.
- `src/app/api/auth/{login,logout,me}` : routes de session, cookie `et_session` httpOnly.
- `src/proxy.ts` : garde-fou léger (présence du cookie) pour les pages — redirige vers `/login`. Les routes `/api/*` ne sont pas concernées, elles font leur propre vérification.
- `src/lib/api-auth.ts` : wrappers `withAuth`/`withAdmin` utilisés par chaque route API pour l'autorisation réelle côté serveur (lecture/écriture, rôle admin).
- Gestion des comptes : page `/users` (admin uniquement), routes `src/app/api/admin/users/*`.

### Données

- `prisma/schema.prisma` : schéma complet (10 tables).
- `src/app/api/**/route.ts` : une route par ressource (catégories, départements, employés, équipements, prêts, incidents, maintenances), chacune authentifiée.
- `src/lib/api.ts` : couche cliente qui appelle ces routes — c'est le seul point d'accès aux données utilisé par les pages.
- Les prêts (`/api/loans`, `/api/loans/[id]/return`) exécutent leurs écritures multi-tables dans une transaction Prisma (`$transaction`) pour garantir l'atomicité (prêt + items + statut des équipements).

### Photos d'équipement

- Upload : `POST /api/equipment/[id]/photos` (admin), écrit sur disque sous `UPLOADS_DIR/equipment/<id>/`.
- Lecture : `GET /api/uploads/[...path]` (authentifié), avec protection anti path-traversal.
- En production, `UPLOADS_DIR` doit pointer vers un volume Docker persistant, en dehors de `public/`.

### Fonctionnalités IA (masquées)

`src/lib/config.ts` exporte `AI_FEATURES_ENABLED = false`. Le code (composants + routes `/api/ai/*`) reste en place ; passer ce flag à `true` les réactive dans l'UI. Nécessite `ANTHROPIC_API_KEY`.

## Déploiement

- Image Docker (build standalone Next.js), CI/CD, reverse-proxy TLS — comme les autres apps de l'infra.
- Base Postgres dédiée : `DATABASE_URL` pointe dessus, migrations appliquées via `npx prisma migrate deploy` au démarrage du conteneur.
- Volume nommé monté sur le chemin donné par `UPLOADS_DIR` pour la persistance des photos entre redéploiements.
- Variables requises en prod : `DATABASE_URL`, `JWT_SECRET`, `UPLOADS_DIR`, `SEED_ADMIN_*` (première mise en service), `ANTHROPIC_API_KEY` (si IA activée).
