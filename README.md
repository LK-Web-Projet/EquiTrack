# 🚲 EquiTrack

**EquiTrack** est une application web (Next.js) de gestion de flotte de vélos sur le terrain. Elle permet aux techniciens de recenser l'état matériel des vélos, de prendre des photos des dégradations, d'obtenir un diagnostic assisté par IA, et de générer des rapports PDF pour l'atelier.

## 🛠️ Stack Technique

- **Framework** : [Next.js 16](https://nextjs.org/) (React 19, TypeScript)
- **Style** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Base de données** : PostgreSQL via [Prisma ORM](https://www.prisma.io/) (`@prisma/client`, `@prisma/adapter-pg`, `pg`)
- **Auth / Backend as a Service** : [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`) — Auth, base de données, service role
- **IA** : [Anthropic Claude SDK](https://docs.anthropic.com/) (`@anthropic-ai/sdk`) — diagnostic d'incidents et analyse de flotte
- **State Management** : [Zustand](https://zustand-demo.pmnd.rs/)
- **Icônes** : [Lucide React](https://lucide.dev/)
- **QR Code** : `html5-qrcode`, `qrcode.react`
- **Génération PDF** : `jspdf` & `jspdf-autotable`
- **Dates** : `date-fns`
- **Runtime scripts** : `tsx`

## 🚀 Installation & Lancement Rapide

```bash
# 1. Installer les dépendances
pnpm install

# 2. Générer le client Prisma
pnpm db:generate

# 3. Lancer le serveur de développement
pnpm dev
```

Ouvrez ensuite votre navigateur sur `http://localhost:3000`.

### Scripts utiles

| Commande | Description |
|---|---|
| `pnpm dev` | Lance le serveur de développement |
| `pnpm build` | Build de production |
| `pnpm start` | Lance le serveur en production |
| `pnpm lint` | Lint du code |
| `pnpm db:pull` | Synchronise le schéma Prisma depuis la base |
| `pnpm db:migrate` | Applique les migrations Prisma (dev) |
| `pnpm db:generate` | Génère le client Prisma |
| `pnpm db:studio` | Ouvre Prisma Studio |
| `pnpm db:seed` | Seed la base de données |
| `pnpm db:backup` | Backup de la base de données |
| `pnpm db:reset` | Réinitialise la base de données |

## 🔑 Variables d'environnement (VPS)

À initialiser sur le serveur (fichier `.env` ou `.env.local`, jamais commité — voir `.gitignore`) :

```bash
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=            # URL du projet Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Clé publique (anon/publishable)
SUPABASE_SERVICE_ROLE_KEY=           # Clé service role (accès admin, à garder secrète, jamais exposée côté client)

# --- Base de données (Prisma) ---
DATABASE_URL=                        # Connexion PostgreSQL, ex: postgresql://user:password@host:5432/dbname

# --- IA (Anthropic Claude) ---
ANTHROPIC_API_KEY=                   # Clé API Anthropic (diagnostic incidents / analyse de flotte)

# --- Seed admin (utilisé par pnpm db:seed) ---
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=
```

⚠️ **Sécurité** :
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` et `ANTHROPIC_API_KEY` sont des secrets sensibles : ne jamais les committer, ne jamais les préfixer `NEXT_PUBLIC_`.
- Seules les variables préfixées `NEXT_PUBLIC_` sont exposées au navigateur.
- En production, définir ces variables directement dans l'environnement du VPS (ex: fichier `.env` chargé par le process manager, ou variables systemd/PM2/Docker), pas dans un fichier suivi par git.

---
*Développé sur-mesure pour la gestion professionnelle de flottes de vélos.*
