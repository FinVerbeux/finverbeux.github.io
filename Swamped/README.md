# Swamped

Swamped est un jeu idle/clicker cyberpunk jouable directement dans le navigateur. Vous pilotez une infrastructure réseau, gérez la chaleur, l'énergie, des attaques rivales, des contrats de factions et une couche narrative Matrix.

## Vision produit
- Expérience "terminal fantasy" immédiate (aucune installation).
- Progression profonde (infrastructure, compétences, talents, marché noir, prestige).
- Narrative incrémentale via Matrix + achievements.

## Stack technique
- HTML/CSS/JavaScript vanilla (sans framework).
- Persistance locale via `localStorage`.
- Build-less: ouverture directe de `index.html`.

## Lancer le projet
Option la plus simple :
1. Cloner le repo.
2. Ouvrir `index.html` dans un navigateur moderne.

Option serveur local recommandée (évite certains problèmes de politiques de navigateur) :
```bash
python -m http.server 8080
```
Puis ouvrir `http://localhost:8080`.

## Structure du projet
- `index.html` : structure de l'interface + points d'ancrage DOM.
- `assets/styles.css` : styles UI (thèmes, panneaux, tabs, Matrix).
- `assets/app.js` : logique de jeu (state, boucle, économie, événements, commandes).

## Notes d'architecture
- Boucle runtime via `requestAnimationFrame` + tick simulation fixe (`100ms`) pour un comportement stable selon les devices.
- Stratégie de sécurité DOM: échappement du texte utilisateur/variable avant injection dans les zones dynamiques critiques (logs/messages).
- Conversion BigInt centralisée avec garde (`bigintToNumberSafe`) pour limiter les erreurs de précision en late-game.

## Équilibrage (balancing) – principes
- Les coûts montent de façon exponentielle progressive (buildings/consumables/market).
- Les événements négatifs (surchauffe, attaques, pannes) sont pensés pour casser la linéarité.
- Le prestige sert de compression de progression et de multiplicateur long terme.

## Roadmap proposée
- [ ] Découper `assets/app.js` en modules (`state.js`, `ui.js`, `systems/*`).
- [ ] Ajouter des tests de non-régression sur l'économie (coûts, production, prestige).
- [ ] Ajouter instrumentation analytics (session length, D1/D7 retention locale/anonyme).
- [ ] Créer mode "new game plus" narratif.
- [ ] Export/import de save chiffrée.

## Collaboration
Contributions bienvenues:
- ouvrez une issue avec reproduction claire,
- proposez PR ciblée (une feature/fix par PR),
- documentez l'impact gameplay si vous touchez au balancing.
