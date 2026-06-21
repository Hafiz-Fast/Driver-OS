# Driver-OS
Many car drivers while driving need an app which can run in their attached LED in the car, which they can easily control using their voice, and can find many useful features for car service and more.

## Phase 1 Foundation

This backend is wired for Django REST Framework, JWT auth, and Supabase Postgres.

The repo now also includes a React dashboard shell under `frontend/`.

### Environment

Copy `backend/.env.example` to `backend/.env` and fill in the values.

### What is ready

- User registration endpoint with JWT token issuance
- Login and refresh via SimpleJWT
- Car profile CRUD foundation
- Env-driven Supabase Postgres connection using the pooled `DATABASE_URL`
- Structured React dashboard shell for the empty starter UI

### Main endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`
- `GET /api/cars/`
- `POST /api/cars/`
- `GET /api/cars/<id>/`
- `PUT /api/cars/<id>/`
- `PATCH /api/cars/<id>/`
- `DELETE /api/cars/<id>/`

### Notes

- The Django ORM is used here for persistence. Prisma is not part of this backend stack.
- Use the pooled database URL for the app runtime. Keep the direct URL available for migration or maintenance tasks that need a non-pooled connection.
