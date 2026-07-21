---
name: User Story
about: Décrire une fonctionnalité du point de vue utilisateur, avec ses tests E2E
title: ""
labels: []
assignees: ""
---

## Contexte

<!-- Pourquoi cette fonctionnalité ? Le besoin qu'elle couvre, ce qui la motive. -->

## Récit utilisateur

En tant qu'utilisateur, je veux <objectif>, afin de <bénéfice>.

## Critères d'acceptation

- [ ] <critère vérifiable>
- [ ] <critère vérifiable>

## Tests E2E (Gherkin)

<!--
Scénarios qui seront traduits en tests Playwright (dossier tests/e2e/).
Chaque `Scénario:` devient un test dont le titre est préfixé
« US#<numéro du ticket> – <nom du scénario> », ce qui alimente le tableau
de couverture par US dans le résumé du run GitHub Actions.
-->

```gherkin
# language: fr
Fonctionnalité: <nom de la fonctionnalité>

  Scénario: <nom du scénario>
    Étant donné que <contexte initial>
    Quand <action de l'utilisateur>
    Alors <résultat attendu>
    Et <résultat additionnel éventuel>
```
