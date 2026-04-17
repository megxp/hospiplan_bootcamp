# HospiPlan

Application de gestion de planning hospitalier avec backend Django/DRF et frontend React.

## Stack

- Backend: Django + Django REST Framework
- Base de donnees: PostgreSQL
- Frontend: React + React Router + FullCalendar

## Installation rapide

### 1) Backend (Python)

Depuis la racine du projet:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install django djangorestframework django-cors-headers django-filter psycopg[binary]
python manage.py migrate
python manage.py runserver
```

Notes:
- Il n'y a pas encore de `requirements.txt` dans le repo.
- Sans installation des paquets ci-dessus, `django` et DRF ne se chargent pas.

### 2) Frontend (React)

```bash
cd frontend
npm install
npm start
```

Frontend: `http://localhost:3000`  
API backend: `http://127.0.0.1:8000/api`

## Reponses concretes aux points remontes

### 1) "Le menu Planning ne laisse pas cliquer Shifts/Affectations"

Corrige.
- Le menu n'est plus uniquement base sur le survol.
- Ouverture/fermeture au clic.
- Fermeture au clic exterieur.
- Navigation vers `Shifts` et `Affectations` fonctionnelle.

Fichier: `frontend/src/App.js`

### 2) "Le calendrier est surcharge"

Ameliore.
- Events compacts (taille/padding reduits)
- Slot height reduite
- `dayMaxEvents` active
- Header de filtres simplifie
- Compteur d'affectations affiche

Fichier: `frontend/src/pages/CalendarPage.jsx`

### 3) "Tous les soignants/services ont la meme couleur"

Cause identifiee et corrigee.
- Le frontend reutilisait une valeur de secours (`1`) faute d'ID unite exploitable.
- Le backend expose maintenant `care_unit_id` dans les affectations.
- Le frontend colore les events avec ce vrai `care_unit_id`.

Fichiers:
- `planning/serializers.py`
- `frontend/src/pages/CalendarPage.jsx`

### 4) "Quand je filtre, tout disparait"

Corrige.
- Filtrage base sur `careUnitId` coherent avec les donnees backend.
- Plus de comparaison sur champ ambigu.

Fichier: `frontend/src/pages/CalendarPage.jsx`

### 5) "Redirection post-generation vers calendrier"

Corrige.
- Apres generation, redirection directe vers `/calendar?start=...&end=...`
- Le calendrier se positionne sur la periode generee.

Fichiers:
- `frontend/src/pages/PlanningPage.jsx`
- `frontend/src/pages/CalendarPage.jsx`

### 6) "Contrainte hebdo backend (__week)"

Corrige.
- `check_weekly_hours` n'utilise plus `__week`.
- Fenetre ISO explicite (lundi -> dimanche) avec bornes de dates.

Fichier: `planning/constraints.py`

## Analyse code: points restants importants

1) Accessibilite navbar  
Le dropdown `Planning` est stable, mais pas encore totalement accessible clavier (navigation complete au clavier + ARIA).  
Recommandation: passer sur un composant menu accessible ou enrichir l'existant.

2) Dependances Python non figees  
Pas de `requirements.txt` / `pyproject.toml`.  
Recommandation: figer les versions et documenter l'installation officielle.

3) Config sensible dans `settings.py`  
Base de donnees en dur (`USER`, `PASSWORD`, etc.).  
Recommandation: migrer vers variables d'environnement (`.env`) pour dev/prod.

4) Tests manquants sur les correctifs critiques  
Recommandation minimale:
- test unitaire `check_weekly_hours`
- test API generation
- test UI filtre calendrier (non-regression "tout disparait")

## Etat actuel du routing

- `/` redirige vers `/calendar`
- `/calendar` vue principale
- `/planning` page de generation
- `Shifts` et `Affectations` accessibles via menu `Planning`

## Resume

Le socle est maintenant plus solide: navigation plus claire, calendrier filtrable et lisible, redirection post-generation correcte, et contrainte hebdo backend fiabilisee.  
La prochaine etape pour un rendu vraiment "production-ready" est de figer les dependances, sortir les secrets de la config, et ajouter des tests de non-regression.