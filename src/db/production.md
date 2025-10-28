Déployer migration sur Neon Database en prod

1. `vercel link`

2. `vercel env pull .env.production`

3. `source .env.production
NODE_ENV=production npx drizzle-kit push`