# 🚀 Guide de Déploiement - Secret Santa

## 📋 Configuration Base de Données

L'application utilise automatiquement la bonne base de données selon l'environnement :

- **🐳 Développement** : PostgreSQL via Docker (`node-postgres`)
- **🚀 Production** : Neon serverless PostgreSQL (`@neondatabase/serverless`)

### Configuration Neon (Production)

#### 1. Créer une base de données Neon

1. Aller sur [Neon Console](https://console.neon.tech)
2. Créer un nouveau projet
3. Récupérer la connection string depuis le dashboard

#### 2. Variables d'environnement de production

```bash
# Production Environment Variables
NODE_ENV=production
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_token_here
NEXT_PUBLIC_APP_URL=https://votre-domaine.com

# SMTP Configuration (Production)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
SMTP_FROM_NAME=Secret Santa
SMTP_FROM_EMAIL=noreply@votre-domaine.com
```

#### 3. Migration de la base de données

Après avoir configuré votre connection string Neon :

```bash
# Appliquer les migrations en production
npx drizzle-kit push

# Ou générer et appliquer manuellement
npx drizzle-kit generate
npx drizzle-kit migrate
```

## 📦 Déploiement sur Vercel

1. **Push sur GitHub**
2. **Connecter le repo à Vercel**
3. **Configurer les variables d'environnement** dans Vercel Dashboard
4. **Déployer** 🚀

### Variables Vercel requises :

```
NODE_ENV=production
DATABASE_URL=postgresql://...neon...
BLOB_READ_WRITE_TOKEN=...
NEXT_PUBLIC_APP_URL=https://...
SMTP_HOST=...
SMTP_PORT=...
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM_NAME=Secret Santa
SMTP_FROM_EMAIL=...
```

## 🔄 Migration depuis PostgreSQL local

Si vous avez des données en développement à migrer :

1. **Exporter les données** depuis PostgreSQL local
2. **Importer dans Neon** via leur interface ou SQL
3. **Tester** avec `NODE_ENV=production` localement

## 🛠️ Développement Local

Reste identique avec Docker :

```bash
# Démarrer l'environnement de développement
docker-compose up -d

# Appliquer les migrations
npm run db:push

# Ou générer et appliquer
npm run db:generate
npm run db:migrate
```

## 📊 Monitoring

- **Neon** : Dashboard intégré pour monitoring des requêtes
- **Vercel** : Analytics et logs dans le dashboard
- **Emails** : Configuration SMTP production pour les notifications

## 🔧 Troubleshooting

### Erreur de connexion Neon
- Vérifier la connection string
- S'assurer que `sslmode=require` est présent
- Vérifier les IP autorisées dans Neon

### Images non affichées
- Vérifier `BLOB_READ_WRITE_TOKEN` Vercel
- S'assurer que `NEXT_PUBLIC_APP_URL` est correct

### Emails non envoyés
- Tester la configuration SMTP
- Vérifier les credentials email
- Contrôler les logs Vercel
