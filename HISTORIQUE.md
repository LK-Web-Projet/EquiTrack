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

## [0.2.0] - 2026-08-24

### Ajouté
- Bouton "œil" pour afficher/masquer le mot de passe saisi, sur la page de connexion et les formulaires de mot de passe (changement de mot de passe, réinitialisation admin).
- Numéro de version affiché en bas de la barre latérale, lu directement depuis `package.json` (ne se désynchronise plus).

### Modifié
- Nouvelle identité visuelle : couleur principale rouge (`#ef4444`), barre latérale noire, nouveau logo (`public/logomet.svg`) sur la page de connexion et dans l'application.

## [0.1.0] - antérieur

Version de référence avant la mise en place de cet historique. Le détail des changements précédents reste consultable via `git log`.
