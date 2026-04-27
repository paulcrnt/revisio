# 🚀 Guide de Démarrage Rapide - Revisio

## Installation en 3 étapes

### 1️⃣ Préparer les fichiers

Placez tous les fichiers téléchargés dans un dossier nommé `revisio` :

```
revisio/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── server.js
├── .dockerignore
├── README.md
└── public/
    ├── index.html
    ├── todo.html
    ├── hub.html
    ├── css/
    │   ├── main.css
    │   ├── todo.css
    │   └── hub.css
    └── js/
        ├── todo.js
        └── hub.js
```

### 2️⃣ Lancer avec Docker

```bash
cd revisio
docker-compose up -d
```

### 3️⃣ Accéder à l'application

Ouvrez votre navigateur : **http://localhost:10450**

---

## ✅ Vérification

```bash
# Vérifier que le container tourne
docker-compose ps

# Devrait afficher :
# NAME            STATUS
# revisio-app     Up (healthy)
```

---

## 🎯 Utilisation

### To Do List
1. Cliquez sur l'onglet "To Do List"
2. Cliquez sur "+ Nouvelle tâche"
3. Remplissez le titre, description, matière, couleur
4. Glissez-déposez les cards entre les colonnes !

### Hub des Matières
1. Cliquez sur l'onglet "Hub des Matières"
2. Cliquez sur "+ Nouvelle matière"
3. Sélectionnez une matière dans la sidebar
4. Cliquez sur "+ Ajouter un bloc"
5. Choisissez le type de bloc (Texte, Liste, Code, Formule, Image, Citation)

---

## 📊 Où sont mes données ?

- **Base de données** : `./data/revisio.db`
- **Images** : `./uploads/`

Ces dossiers sont créés automatiquement au premier lancement.

---

## 🔄 Commandes utiles

```bash
# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Voir les logs
docker-compose logs -f

# Rebuild après changement
docker-compose up -d --build
```

---

## 🐛 Problèmes ?

**Le site ne charge pas ?**
```bash
docker-compose logs
```

**Port 10450 déjà utilisé ?**
Modifiez dans `docker-compose.yml` :
```yaml
ports:
  - "127.0.0.1:AUTRE_PORT:3000"
```

**Réinitialiser complètement ?**
```bash
docker-compose down
rm -rf data/ uploads/
docker-compose up -d
```

---

Bon travail ! 🎓
