# Travel Blog

A visual travel journal — mark memorable locations on an interactive map with stories, dates and photos. Each user gets their own private blog secured with Google sign-in.

**Live site:** https://travel-blog-production-0a44.up.railway.app

---

## What Was Built

- [x] Interactive Leaflet map — click anywhere to place a marker
- [x] Travel memory form — location name, date, story, why you went, why it was special
- [x] Photo uploads — stored permanently via Cloudinary
- [x] Chronological arrows connecting travel locations on the map
- [x] Blog post sidebar showing all memories
- [x] PostgreSQL database — data persists across sessions
- [x] Google OAuth — each user has their own private blog
- [x] Anime-inspired UI with sakura palette and Japanese fonts
- [x] Deployed to Railway with production Postgres

---

## Architecture

```mermaid
graph TD
    A[User clicks map location] --> B[Fill out memory form]
    B --> C[Name, Date, Story, Photo]
    C --> D[POST /api/memories]
    D --> E[Express API]
    E --> F[Cloudinary - photo upload]
    E --> G[PostgreSQL - save memory]
    G --> H[Return saved entry]
    H --> I[Add marker + arrow to map]
    H --> J[Add blog post to sidebar]

    K[Page Load] --> L[Check Google Auth]
    L --> M[GET /api/memories]
    M --> E
    E --> N[Fetch user memories from DB]
    N --> I
    N --> J
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Map | Leaflet.js + Leaflet PolylineDecorator |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | Google OAuth via Passport.js |
| Photos | Cloudinary |
| Hosting | Railway |

---

## Running Locally

### Prerequisites

- Node.js v18+
- PostgreSQL installed and running
- A Google Cloud project with OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))
- A Cloudinary account — free tier ([cloudinary.com](https://cloudinary.com))

### Setup

**1. Clone the repo**
```bash
git clone https://github.com/sjbmcg/travel-blog
cd travel-blog
```

**2. Install dependencies**
```bash
npm install
```

**3. Create a `.env` file in the root**
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost/postgres
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=any_random_string
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

**4. Create the database tables**
```sql
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    google_id  TEXT UNIQUE NOT NULL,
    name       TEXT,
    email      TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE memories (
    id                 SERIAL PRIMARY KEY,
    location_name      VARCHAR(255) NOT NULL,
    date_visited       DATE NOT NULL,
    what_happened      TEXT,
    why_did_you_go     TEXT,
    why_was_it_special TEXT,
    lat                NUMERIC,
    lng                NUMERIC,
    user_id            INTEGER REFERENCES users(id),
    photo_url          TEXT,
    created_at         TIMESTAMP DEFAULT NOW()
);
```

**5. Set up Google OAuth**
- Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
- Create an OAuth client (Web application)
- Set authorised redirect URI to `http://localhost:3000/auth/google/callback`

**6. Start the server**
```bash
node server.js
```

**7. Open the app**
```
http://localhost:3000
```

---

## Deploying to Railway

1. Push code to GitHub (`.env` and `node_modules` are gitignored)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** plugin
4. Add environment variables in the Railway dashboard (same as `.env` above, use `${{Postgres.DATABASE_URL}}` for `DATABASE_URL`)
5. Run the SQL migrations via the Railway Postgres public connection URL
6. Update Google OAuth redirect URI to your Railway domain