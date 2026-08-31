# Crown's Worship Ministry

Responsive bilingual website for Crown's Worship Ministry, with public Events
and admin entry points when those page bundles are present.

## Local development

```bash
pnpm install
pnpm dev
```

The home page runs at `http://127.0.0.1:5183/`. The `/events/` and `/admin/`
pages are picked up automatically once their entry files exist.

## Production build and preview

```bash
pnpm run build
pnpm run preview
```

## Environment variable names

The current static home page does not require environment variables. Event and
admin/API integrations should provide these names through the deployment
environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
