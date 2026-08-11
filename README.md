# 🚲 CycleCheck

**CycleCheck** est une application web moderne (PWA-ready) conçue pour la gestion de flotte de vélos sur le terrain. Elle permet aux techniciens de recenser l'état matériel des vélos, de prendre des photos des dégradations, et de générer de puissants rapports PDF pour l'atelier.

## ✨ Fonctionnalités Principales

- **Diagnostic Terrain** : Ajout rapide de vélos et notation de l'état des pièces (Bon, À réparer, À remplacer). Pièces personnalisables par l'utilisateur.
- **Photos Intégrées** : Capture d'image depuis la caméra du téléphone ou l'ordinateur, avec algorithme de compression automatique (JPEG 800px) pour préserver le stockage.
- **Intelligence Métier (Dashboard)** : Calculs automatiques du "Taux de Santé" global de la flotte et du Top 3 des pannes fréquentes.
- **Génération de PDF Pro** : Création instantanée de rapports structurés et design (Inventaire Global, Vélos à réparer, Liste de courses des pièces).
- **Interface Premium** : Design en Tailwind CSS v4 avec prise en charge native du mode Sombre (Dark Mode) et Clair (Light Mode).
- **100% Hors-Ligne & Sécurisé (Client-Side)** : L'application stocke les données localement sans base de données externe. Un module d'Export (Sauvegarde JSON) et d'Import permet de sécuriser les données manuellement.

## 🛠️ Stack Technique

- **Framework** : [Next.js](https://nextjs.org/) (React 19)
- **Style** : [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management** : [Zustand](https://zustand-demo.pmnd.rs/) (Persistance LocalStorage)
- **Icônes** : [Lucide React](https://lucide.dev/)
- **Génération PDF** : `jspdf` & `jspdf-autotable`

## 🚀 Installation & Lancement Rapide

Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé sur votre machine.

```bash
# 1. Cloner ou ouvrir le projet
cd cycle_check

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev
```

Ouvrez ensuite votre navigateur sur `http://localhost:3000`.

## 📦 Sauvegarde & Sécurité des Données

⚠️ **Important** : L'architecture actuelle sauvegarde vos vélos directement dans la mémoire du navigateur (*LocalStorage*). Si vous videz votre cache, vous perdrez ces données.
👉 Rendez-vous dans les "Paramètres > Sécurité des données" pour utiliser l'outil d'**Export** à la fin de chaque journée et stocker votre fichier `.json`. Vous pourrez le ré-importer si besoin !

---
*Conçu et développé sur-mesure pour la gestion professionnelle de flottes de vélos rapides.*
