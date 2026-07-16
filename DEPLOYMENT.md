# Deployment

## Backend

- Build with `npm run build` inside `researchreasoner-backend`
- Start with `npm start`
- Provide `NEO4J_*`, `GROQ_API_KEY`, and `ALLOWED_ORIGINS`
- Health endpoints: `/health`, `/health/live`, `/health/ready`

## Frontend

- Build with `npm run build` inside `frontend`
- Set `VITE_API_BASE_URL` to the public backend API base URL
- Deploy the `dist/` output to a static host such as Vercel

## Production checklist

1. Keep `DEMO_MODE=false` and `VITE_DEMO_MODE=false`
2. Restrict CORS with `ALLOWED_ORIGINS`
3. Verify Neo4j connectivity before accepting traffic
4. Prefer real provider data and clear degraded-state messaging
