# Deployment Guide

This document outlines how to deploy the OutdoorTeam backend to Render and prepare the application for production.  The backend is located in the `server/` directory and depends on a shared set of TypeScript schemas in the top‑level `shared/` directory.  The steps below ensure that the shared code is compiled into the server build output and that the service runs reliably in a production environment.

## Render configuration

When creating a new **Web Service** in Render, use the following settings:

| Setting        | Value                                           | Notes |
|---------------|--------------------------------------------------|------|
| Root Directory | `server/`                                       | Keep this as‑is so Render runs commands from the server folder. |
| Build Command | `npm ci --include=dev && npm run build`          | The `--include=dev` flag installs dev dependencies such as TypeScript and type definitions.  Running `npm run build` compiles both `server/` and `shared/` into `server/dist`. |
| Start Command | `npm start`                                      | This runs `node dist/server/index.js` as defined in `package.json`. |
| Node version   | 20.x                                            | Specified via `"engines": { "node": "20.x" }` in `package.json` for stability. |

During the first build, Render will install dependencies, compile the TypeScript code, and then start your server from the compiled output.  If the build fails, check the logs and ensure that TypeScript errors are fixed rather than suppressed.

## Environment variables

Configure the following environment variables in Render.  Never commit secrets to the repository:

- **SUPABASE_URL** – Base URL of your Supabase project.
- **SUPABASE_ANON_KEY** – Public anon key for client‑side interactions.  Used by the front‑end and mobile app.
- **SUPABASE_SERVICE_ROLE_KEY** – Service role key used by the backend for privileged operations (e.g. inserting into tables with RLS policies).  Do **not** expose this in the front‑end.
- **JWT_SECRET** – Secret string used to sign JSON Web Tokens.  Must be the same on all server instances.
- **VAPID_PUBLIC_KEY** and **VAPID_PRIVATE_KEY** – Keys used for Web Push notifications.  Generate a proper key pair and set both values.
- Any other variables referenced in the codebase (e.g. `DATA_DIRECTORY` for uploaded files).

## Supabase configuration

To allow authentication and API requests from your production domain, adjust your Supabase project settings:

1. **Site URL and Redirect URLs** – In the Supabase Dashboard under *Authentication → Settings*, set the **Site URL** to your public domain (e.g. `https://app.mioutdoorteam.com`) and include the same URL in **Redirect URLs**.  This ensures that OAuth and magic‑link flows return to your site.
2. **CORS** – Under *Authentication → Settings*, add your frontend domain and backend domain to the list of allowed origins so that browsers can call your Supabase endpoints without being blocked.
3. **Database migrations** – Apply the migration script `supabase_migration_outdoorteam.sql` (provided in this repository) using the SQL editor in Supabase or via the CLI.  This script adds the new tables (`content_library`, `broadcast_messages`, `user_plan_assignments`) and the `is_active` column to `public.users`, and sets up row‑level security (RLS) policies.  The script is idempotent and safe to run multiple times.
4. **RLS policies** – Review your existing policies.  The migration script enables RLS on the new tables and defines read policies.  Do not change policies on existing tables unless you know what you are doing.

## Post‑deployment checklist

Use this checklist after deploying to ensure everything works correctly:

- [ ] Hit `GET /health` or `/healthz` on your deployed service and verify it returns a 200 response with status `ok`.
- [ ] Inspect Render logs to confirm there are **no** `MODULE_NOT_FOUND` errors related to `validation‑schemas.js`.  If such an error appears, confirm that the shared code compiled into `server/dist/shared`.
- [ ] From your mobile app or frontend, perform a login and a few API calls (e.g. updating daily habits) to ensure JWT authentication and database writes work with the remote backend.
- [ ] In Supabase, confirm the new tables `content_library`, `broadcast_messages`, and `user_plan_assignments` exist.  Check that the `users` table now has the `is_active` column.  Verify that RLS policies on these tables behave as expected: anyone can read from `content_library` and `broadcast_messages`, and each user can only read their own rows in `user_plan_assignments`.
- [ ] If you added or modified environment variables, verify that they are correctly set in the Render environment.

Once all these checks pass, your backend should be ready for production use and your APK can communicate with the deployed API.
