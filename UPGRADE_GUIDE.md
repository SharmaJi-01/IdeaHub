# IdeaHub Enhanced Upgrade Guide

This bundle is an enhanced PostgreSQL-backed version of the IdeaHub package.

## What is improved

- PostgreSQL relational tables for login history, shares, and notifications.
- PostgreSQL full-text search with `tsvector` + GIN index + trigger maintenance.
- Persistent likes, saves, comments, shares, and view counts.
- Notification dropdown with unread count, mark-read, and mark-all-read.
- Notifications for likes, saves, comments, shares, verification, and moderation.
- Login history stored in PostgreSQL.
- Search and sorting backed by the API instead of demo-only filtering.
- Idea Reels filtered to approved `content_type = 'reel'` records.
- Reel autoplay/pause uses viewport visibility and starts muted for browser autoplay compatibility.
- Reel view/share/like/save/comment interactions persist to PostgreSQL.
- Inline comments and a reusable comments modal.
- Better My Ideas filters for all/published/pending/rejected.
- Sticky responsive navbar, notification menu, account menu, keyboard search shortcut, and mobile navigation.
- Seed data includes approved reels and social activity so the feature set can be tested immediately.

## Important before replacing the local project

Your existing `D:\sem-3\IdeaHub` folder may contain videos, uploads, `.env` values, and database data that you want to keep.

Back up the entire existing folder first. At minimum preserve:

- `backend/.env`
- `backend/uploads/`
- any files you have personally edited
- your existing PostgreSQL database if you do not want demo data

Do **not** overwrite your `.env` blindly. Keep the working PostgreSQL connection string from your machine.

## Safe upgrade path (preserve existing database data)

1. Back up `D:\sem-3\IdeaHub`.
2. Copy the enhanced `frontend/app.js` and `frontend/styles.css` into your current `frontend` folder.
3. Copy the enhanced backend models/controllers/routes/schema and the new notification model/controller/routes/scripts.
4. Keep your existing `backend/.env` and `backend/uploads/`.
5. In `backend`, run:

```powershell
npm install
```

6. Apply the schema upgrade. The schema is written with `IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` patterns for the current PostgreSQL structure.

```powershell
Get-Content .\config\schema.sql | & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d ideahub
```

7. Verify the social tables:

```powershell
npm run db:check
```

8. Start the backend:

```powershell
npm start
```

## Demo reset path

To load the included demo users, 6 demo items (4 ideas + 2 reels), comments, likes, saves, shares, login history, and notifications:

```powershell
npm run seed
```

**Warning:** `npm run seed` intentionally truncates the social tables and recreates demo data. Do not use it when you need to preserve your existing database content.

Demo accounts after seeding:

- Admin: `admin@ideahub.local` / `Admin@123`
- Verified student: `demo@ideahub.local` / `demo1234`

## Reel moderation flow

A submitted reel can remain `pending` until it is approved. The Idea Reels page only shows approved reel records. An administrator can review pending content and approve/reject it.

## PostgreSQL features used

The upgraded project uses PostgreSQL for relational integrity and persistent application state rather than treating the database as a simple content dump. The search layer uses `tsvector` maintained by triggers and a GIN index, while social actions are separate related tables with foreign keys and unique constraints.

## Testing checklist

After startup, test:

- Register/login.
- Login history on your profile.
- Explore search and sort.
- Like, save, comment, and share on an idea.
- Notification bell after another action.
- My Ideas filters.
- Upload a reel.
- Admin approval of a pending reel.
- Approved reel playback in Idea Reels.
- Reel like/save/comment/share persistence.
- Logout/login and verify that state remains in PostgreSQL.
