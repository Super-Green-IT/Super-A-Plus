This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local member document storage

Member documents are stored outside `public/` in `storage/documents/` by default. Set `DOCUMENT_STORAGE_DIR` to a persistent local directory if needed. Keep this directory backed up with the database; it contains member identity documents and is excluded from Git.

Before migrating existing member documents, back up the database and the `public/uploads/documents/` directory. Run `npm run documents:migrate-private` to review the migration count, then `npm run documents:migrate-private -- --apply` to copy files to private storage, update their database records, and remove their public copies. The app serves documents through an authenticated, branch-scoped endpoint after migration.

This local filesystem storage is for local/self-hosted development. It is not persistent storage for Vercel or other ephemeral/serverless deployments.

## Run the backend locally

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `DIRECT_URL`, a unique `AUTH_SECRET` (at least 32 characters), and a unique initial admin password (12–72 UTF-8 bytes). Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Apply the Prisma schema to the local PostgreSQL database with `npm run db:push`.
5. Seed the initial admin and development reference data with `npm run db:seed`. Seeding does not reset an existing admin password.
6. Start the app with `npm run dev` and sign in using `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.

`npm run db:push` is intended for local development. Before deploying, create and review a Prisma migration with `npm run db:migrate` and deploy it through the environment's migration process.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
