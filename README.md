# IdeaHub — PostgreSQL Version

IdeaHub is a vanilla HTML/CSS/JavaScript frontend with an Express + PostgreSQL backend.

## Requirements
- Node.js 18+ (Node.js 20/22 LTS recommended)
- PostgreSQL 14+ recommended

## First-time setup
1. Create a PostgreSQL database named `ideahub`.
2. Open `backend/.env.example`.
3. Copy it to `backend/.env`.
4. Set `DATABASE_URL` to your PostgreSQL connection string.
5. Set a long random `JWT_SECRET`.
6. Open PowerShell in `backend` and run:

```powershell
npm install
npm run seed
npm start
```

Open:

`http://localhost:5000`

The backend automatically creates the required PostgreSQL tables and indexes from `backend/config/schema.sql`.

## Windows one-click start
After `npm install` and PostgreSQL setup, double-click `START_IDEAHUB.bat`.

## Demo login
- Admin: `admin@ideahub.local` / `Admin@123`
- Verified demo user: `demo@ideahub.local` / `demo1234`

## Database
MongoDB/Mongoose has been removed. All users, ideas, likes, saves, and comments are stored in PostgreSQL.

## Enhanced build

See `ENHANCED_FEATURES.md` for the upgraded Reels, comments, notifications, PostgreSQL search, shares, login history, My Ideas filters and responsive navigation.
