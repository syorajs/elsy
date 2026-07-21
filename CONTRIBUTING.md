# Contributing

## Philosophie

Le projet privilégie des abstractions minimales, des contrats stables et des composants faiblement couplés.

## Workflow

1. Lire `docs/GLOSSARY.md`.
2. Lire `docs/ARCHITECTURE.md`.
3. Vérifier les ADR existantes.
4. Implémenter une tranche verticale complète.
5. Ajouter des tests.
6. Mettre à jour la documentation.

## Règles

- Ne jamais violer les invariants.
- Ne jamais ajouter une abstraction sans besoin concret.
- Préférer deux implémentations avant de généraliser.
- Toute décision structurante doit faire l'objet d'une ADR.

## ADR

Chaque décision importante est documentée dans `docs/decisions/NNN-titre.md` :

- Contexte
- Options étudiées
- Décision
- Conséquences
