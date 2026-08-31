# Historique des modifications

Ce fichier recense les changements notables apportés à EquiTrack, avec la version du logiciel correspondante (champ `version` de `package.json`, aussi affiché en bas de la barre latérale de l'application).

Format de chaque entrée :

```
## [x.y.z] - AAAA-MM-JJ

### Ajouté
- ...

### Modifié
- ...

### Corrigé
- ...
```

À chaque changement notable : incrémenter `version` dans `package.json`, puis ajouter une entrée ici (la plus récente en haut).

---
Rebuild
## [0.6.0] - 2026-08-27

### Ajouté
- Contrainte de cohérence entre `status` et `condition` d'un équipement, posée en base (`equipment_status_condition_check`) et reflétée côté applicatif (`src/lib/equipment-state.ts`) : disponible/emprunté ⇒ toujours "bon état" ; en panne/maintenance ⇒ jamais "bon état" (correct ou mauvais uniquement). Deux équipements réels en violation ont été corrigés au passage de la migration.

### Modifié
- Changer le statut d'un équipement (sélecteur rapide, formulaire d'édition) ajuste désormais automatiquement son état pour rester cohérent, sans double saisie.
- Retour de prêt : si la checklist d'inspection détecte un défaut alors que le retour était déclaré "bon état", l'équipement part en maintenance au lieu de redevenir disponible (la checklist l'emporte). `return_condition = 'damaged'` fait désormais passer l'équipement en "maintenance" plutôt qu'en "disponible" (comportement précédent incohérent : un retour endommagé rendait l'équipement immédiatement re-disponible).
- Maintenance : si la checklist trouve un défaut sur un équipement encore marqué disponible, le statut bascule automatiquement en maintenance. À l'inverse, un état "bon" constaté par la checklist ne fait jamais repasser automatiquement en disponible — action volontaire distincte.
- Formulaire de création d'équipement : le sélecteur d'état initial est retiré (le statut est toujours "disponible" à la création, donc l'état est toujours "bon").

## [0.5.0] - 2026-08-27

### Ajouté
- `GET /api/integration/loans/[id]` : statut courant d'un prêt externe (actif/retourné, état par équipement). Permet à CampTrack de se synchroniser sur l'état réel côté EquiTrack au lieu de dupliquer sa propre saisie de retour — CampTrack gère désormais uniquement l'attribution de matériel, plus le retour (voir son propre HISTORIQUE.md).

## [0.4.0] - 2026-08-27

### Ajouté
- Checklist d'inspection configurable par catégorie (ex. pour "Vélos" : Cadre, Freins, Chaîne, Patins), avec une priorité par pièce (Faible / Normale / Critique) qui détermine son impact sur l'état général de l'équipement. Nouvelle page `/categories/[id]/checklist` (admin) pour la configurer.
- Cette checklist s'affiche à l'identique lors de l'ajout d'une maintenance et lors du traitement d'un retour de prêt : noter une pièce dégradée met à jour automatiquement `condition` de l'équipement (recalculé à chaque événement, pas cumulatif — une réparation confirmée fait bien remonter l'état, contrairement à une simple pénalité qui s'accumulerait indéfiniment). Chaque pièce préremplit son dernier état connu pour ne rien oublier entre deux vérifications.
- Le statut de retour (bon/cassé/endommagé, piloté par le dropdown existant) reste indépendant de ce nouvel état général piloté par la checklist.

### Modifié
- Les libellés et badges d'état général (Bon état / Correct / Mauvais état), auparavant dupliqués dans 3 fichiers, sont regroupés dans `src/lib/constants.ts`.

## [0.3.0] - 2026-08-25

### Ajouté
- Intégration serveur-à-serveur avec CampTrack (app de gestion de campagnes), dans les deux sens :
  - **CampTrack → EquiTrack** : routes `/api/integration/*` protégées par clé Bearer (`EQUITRACK_INTEGRATION_API_KEY`) permettant à CampTrack de lister le matériel disponible pour un service donné, de créer un "prêt externe" (équipement remis à un prestataire pour une campagne) et de le retourner. Un prêt (`loans`) peut désormais avoir un emprunteur interne (employé) ou externe (prestataire CampTrack), jamais les deux.
  - **EquiTrack → CampTrack** : `src/lib/camptrack-client.ts` + `/api/camptrack/services` (proxy authentifié) permettent au formulaire catégorie d'aller chercher en direct la vraie liste des services CampTrack, plutôt qu'une saisie manuelle sujette aux fautes de frappe et aux renommages silencieux.
- Champs "Services CampTrack" (optionnels, sélection multiple) sur les catégories : cases à cocher peuplées en direct depuis CampTrack, restreignent le matériel de cette catégorie à un ou plusieurs services précis ; aucune case cochée = utilisable pour n'importe quelle campagne.

### Modifié
- `src/app/loans/page.tsx` et `src/app/loans/[id]/page.tsx` affichent désormais l'emprunteur externe ("CampTrack : <prestataire>") pour les prêts sans employé interne.

## [0.2.0] - 2026-08-24

### Ajouté
- Bouton "œil" pour afficher/masquer le mot de passe saisi, sur la page de connexion et les formulaires de mot de passe (changement de mot de passe, réinitialisation admin).
- Numéro de version affiché en bas de la barre latérale, lu directement depuis `package.json` (ne se désynchronise plus).

### Modifié
- Nouvelle identité visuelle : couleur principale rouge (`#ef4444`), barre latérale noire, nouveau logo (`public/logomet.svg`) sur la page de connexion et dans l'application.

## [0.1.0] - antérieur

Version de référence avant la mise en place de cet historique. Le détail des changements précédents reste consultable via `git log`.
