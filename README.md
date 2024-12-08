
# Secret Santa Next.js

**Secret Santa Next.js** is a web application built using Next.js, ShadCNUI, Prisma, PostgreSQL, and Vercel Storage. The project allows users to organize and manage Secret Santa gift exchanges.

This project is designed to run locally or be deployed on Vercel.




## Tech Stack

**Client:** Next.js 14, ShadCN/UI, TailwindCSS  
**Backend:** Prisma, PostgreSQL  
**Storage:** Vercel Storage


## Demo

https://secret-santa-nextjs-flax.vercel.app/


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`DATABASE_URL="file:./prisma/dev.db"`

`SMTP_HOST=localhost`

`SMTP_PORT=1025`

`SMTP_USER=`

`SMTP_PASS=`

`SMTP_FROM=secret-santa@localhost`


## Run Locally

Clone the project

```bash
  git clone https://github.com/theoribbi/secret-santa-nextjs.git
```

Go to the project directory

```bash
  cd secret-santa-nextjs
```

Install dependencies

```bash
  npm install
```

Run the Prisma migrations
```bash
  npx prisma migrate dev
```

Generate Prisma Client
```bash
  npx prisma generate
```

Start the server

```bash
  npm run dev
```