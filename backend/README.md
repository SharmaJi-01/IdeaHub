# IdeaHub Backend

IdeaHub now uses PostgreSQL instead of MongoDB/Mongoose.

## Run locally

1. Create a PostgreSQL database named `ideahub`.
2. Update `backend/.env` with your PostgreSQL connection string:

```env
DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/ideahub
```

3. Install dependencies:

```powershell
npm install
```

4. Seed demo data:

```powershell
npm run seed
```

5. Start the server:

```powershell
npm start
```

The Express server serves both the API and the frontend at `http://localhost:5000`.

Database tables are created automatically on startup from `config/schema.sql`.
