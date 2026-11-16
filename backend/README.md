# The Custom Corner backend

## Create the first administrator

From this directory, run:

```sh
npm run admin:create
```

Enter a username and a password of at least 14 characters at the prompts. Password input is masked. The command creates `admin-auth.sqlite` and stores a salted scrypt password hash there. It does not open or alter `orders.sqlite`.

Keep `admin-auth.sqlite` private and back it up. Both `admin-auth.sqlite` and `orders.sqlite` are ignored by Git. To create another administrator, run the same command with a different username. Existing accounts are never overwritten by the setup command.

## Run locally

Start the API from this directory:

```sh
npm start
```

Start the Vite storefront in another terminal from `../frontend` with `npm run dev`, then visit `http://localhost:5173/admin`. Unauthenticated visitors are sent to `/admin/login`.

## Deployment settings

For production, serve the storefront and API over HTTPS on the same site, set `NODE_ENV=production`, and set `FRONTEND_ORIGIN` to the exact storefront origin (for example `https://shop.example.com`). If TLS terminates at a trusted reverse proxy, set `TRUST_PROXY=true`; configure that proxy to replace forwarded headers. The production session cookie is Secure, HttpOnly, host-only, and SameSite=Strict.

If the API has a separate origin, set `VITE_API_BASE_URL` when building the frontend and set `FRONTEND_ORIGIN` on the backend to the storefront origin. Keep both origins on the same site so browsers can send the Strict session cookie.

Persist and back up both SQLite files on the server. Run one backend process against these SQLite files; multiple replicas need a shared transactional database and shared session store before they can safely serve the same shop. Do not deploy with a sample administrator password or place credentials in source control.
