# Invariants

Liste canonique des invariants du projet. Chaque invariant a un identifiant
stable (`INV-xxx`) afin qu'un contract test (Phase 3) ou une revue de code
puisse le référencer précisément, plutôt que de reformuler la règle en
prose à chaque fois.

Ces invariants sont dérivés de `ARCHITECTURE.md` ; ce fichier en est la
version consolidée et numérotée, destinée à être vérifiable.

## Application

- **INV-001** — Une `Application` ne fait référence à aucune plateforme
  (aucun import de package spécifique à Node, Cloudflare, AWS...).
- **INV-002** — Une `Application` n'expose que `fetch(request, ctx?)`.
  Aucune autre méthode publique requise par le contrat.
- **INV-003** — Une `Application` ne contient aucun branchement
  conditionnel sur `ctx.platform`.

## Runtime

- **INV-010** — Un `Runtime` ne fait jamais d'appel bloquant type
  `listen()` ou équivalent démarrage de serveur.
- **INV-011** — Un `Runtime` produit toujours un `FetchHandler` (ou une
  `Application`) en sortie, jamais une réponse HTTP directement.
- **INV-012** — Un `Runtime` ne dépend d'aucun `Adapter`.

## Adapter

- **INV-020** — Un `Adapter` ne contient aucune logique métier
  (aucune décision qui changerait le contenu de la réponse au-delà de la
  simple traduction de format).
- **INV-021** — Un `Adapter` ne génère et n'écrit aucun fichier sur disque.
- **INV-022** — Un `Adapter` est responsable de construire le
  `RuntimeContext` à partir des primitives natives de sa plateforme.

## Preset

- **INV-030** — Un `Preset` est déclaratif : il décrit *quoi* générer, pas
  *comment* l'exécuter.
- **INV-031** — Un `Preset` ne contient aucune logique métier applicative.

## Builder

- **INV-040** — Un `Builder` ne contient aucune logique spécifique à une
  plateforme codée en dur ; toute spécificité passe par le `Preset` choisi.

## Statut

Gelés depuis la Phase 0 (voir `ROADMAP.md`). Toute modification d'un
invariant existant nécessite une nouvelle ADR justifiée par un cas concret
rencontré en implémentation — pas une modification silencieuse.
