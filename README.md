# 🎓 Revisio - L'Espace de Révision Tout-en-Un

Revisio est une application web moderne et responsive, conçue spécifiquement pour les étudiants. Elle centralise tous les outils nécessaires pour s'organiser, mémoriser et rester concentré, le tout dans une interface fluide en Dark Mode.

![Aperçu de Revisio](https://img.shields.io/badge/Interface-Dark_Mode-10b981?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Prêt-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-Pur-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## ✨ Fonctionnalités Principales

Revisio s'articule autour de 4 modules interconnectés :

### 1. ✅ To-Do List (Kanban)
* Tableau interactif à 3 colonnes (À faire / En cours / Fait).
* Glisser-déposer (Drag & Drop) intuitif.
* Personnalisation des cartes : titre, description, tags par matière et couleurs.

### 2. 📚 Hub des Matières (Prise de notes)
* Création dynamique de matières avec code couleur.
* **Blocs modulaires** :
    * 📝 **Texte** : Support du formatage Markdown (Gras, Italique, Titres).
    * 📋 **Listes** : À puces ou numérotées.
    * 🎨 **Dessin** : Canvas interactif (Crayon, gomme, tailles, couleurs).
    * 🖼️ **Images** : Upload multiple, galerie intégrée et **Lightbox** (Plein écran avec navigation clavier/tactile).
    * 💬 **Citations** : Mise en évidence des concepts clés.

### 3. 🍅 Pomodoro (Productivité)
* Timer personnalisable (Classique, Court, Long, Intensif).
* Barre de progression avec animation "vague" dynamique.
* Persistance des sessions (continue même en changeant d'onglet).
* Statistiques de session et notifications sonores.

### 4. 🧠 Cartes Mentales (Mind Mapping)
* Création de schémas conceptuels sur un espace de travail infini (Pan & Déplacement libre).
* Liaisons visuelles fluides (courbes de Bézier SVG).
* **Auto-save** : Sauvegarde en temps réel en arrière-plan.
* Entièrement compatible avec le tactile (Mobile/Tablette).

---

## 🛠️ Stack Technique

L'application a été développée pour être légère, rapide et facile à déployer, sans dépendances frontend lourdes.

* **Frontend** : HTML5, CSS3, JavaScript Vanilla (Aucun framework).
* **Backend** : Node.js + Express.
* **Base de données** : SQLite3 (Base locale, aucune configuration serveur requise).
* **Uploads** : Multer.
* **Déploiement** : Docker & Docker Compose.

---

## 🚀 Installation & Déploiement (Recommandé)

Revisio est packagé sous forme d'image Docker publique "Plug & Play". La base de données et les dossiers se créent automatiquement au premier lancement.

### Prérequis
* [Docker](https://docs.docker.com/get-docker/) et Docker Compose installés sur votre machine ou serveur (VPS).

### Étapes rapides

1. Créez un dossier pour le projet et placez-vous dedans :

"" mkdir revisio && cd revisio ""

Créez un fichier docker-compose.yml et collez ce contenu :
```yaml

services:
  revisio:
    image: paulcrnt/revisio:latest
    container_name: revisio
    ports:
      - "10450:3000"
    volumes:
      - ./revisio-data:/app/data
      - ./revisio-uploads:/app/uploads
    restart: unless-stopped
```
Lancez l'application :

"""docker-compose up -d"""

Ouvrez votre navigateur et accédez à : http://localhost:10450 (ou l'IP de votre serveur).

Vos données (images et base SQLite) seront sauvegardées en toute sécurité dans les dossiers locaux ./data et ./uploads. Même si vous supprimez le conteneur Docker, vos révisions seront conservées !

📱 Responsive Design
Revisio est totalement pensé pour le mobile (Mobile First partiel) :

Menu Hamburger global pour masquer/afficher les sidebars.

Espace de travail en mode paysage optimisé via Flexbox et barres d'outils défilables pour maximiser l'espace de la carte mentale ou des prises de notes.

Support des événements tactiles (touch & drag) sur tous les modules interactifs.

👨‍💻 Auteur
Développé par Paul avec l'aide d'IA (paulcrnt).
