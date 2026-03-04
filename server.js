require('dotenv').config();
const express    = require('express');
const { Pool }   = require('pg');
const passport   = require('passport');
const Google     = require('passport-google-oauth20').Strategy;
const session    = require('express-session');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path       = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app  = express();

const upload = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: { folder: 'travel-blog', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new Google({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  'http://travel-blog-production-0a44.up.railway.app/auth/google/callback'
}, async (_, __, profile, done) => {
    let { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    if (!rows.length) {
        ({ rows } = await pool.query(
            'INSERT INTO users (google_id, name, email) VALUES ($1,$2,$3) RETURNING *',
            [profile.id, profile.displayName, profile.emails[0].value]
        ));
    }
    done(null, rows[0]);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0]);
});

const requireAuth = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: 'Not logged in' });

app.get('/auth/google',          passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login.html' }));
app.get('/auth/logout',          (req, res) => req.logout(() => res.redirect('/login.html')));
app.get('/auth/me',              (req, res) => res.json(req.user || null));

app.post('/api/memories', requireAuth, upload.single('photo'), async (req, res) => {
    const { location_name, date_visited, what_happened, why_did_you_go, why_was_it_special, lat, lng } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO memories (location_name, date_visited, what_happened, why_did_you_go, why_was_it_special, lat, lng, user_id, photo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [location_name, date_visited, what_happened, why_did_you_go, why_was_it_special, lat, lng, req.user.id, req.file ? req.file.path : null]
    );
    res.json(rows[0]);
});

app.get('/api/memories', requireAuth, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at ASC', [req.user.id]);
    res.json(rows);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));