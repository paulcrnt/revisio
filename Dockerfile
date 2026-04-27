# Utiliser une image Node.js légère
FROM node:18-alpine

# Définir le dossier de travail dans le conteneur
WORKDIR /app

# Copier uniquement les fichiers de dépendances en premier (optimisation du cache Docker)
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm install --production

# Copier le reste des fichiers du projet
COPY . .

# Créer les dossiers pour éviter les problèmes de permissions
RUN mkdir -p data uploads

# Exposer le port (celui défini dans ton server.js, par défaut 3000)
EXPOSE 3000

# Commande de démarrage
CMD ["node", "server.js"]
