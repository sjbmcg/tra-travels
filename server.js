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
    const { rows } = await pool.query('SELECT * FROM memories WHERE user_id = $1 ORDER BY date_visited DESC', [req.user.id]);
    res.json(rows);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));

// Public shareable memory page
app.get('/memory/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'memory.html'));
});

// Public trip page
app.get('/trip/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trip.html'));
});

// Public trip API — finds up to 5 memories closest in date to the anchor memory
app.get('/api/trip/:id', async (req, res) => {
    const anchor = await pool.query('SELECT * FROM memories WHERE id = $1', [req.params.id]);
    if (!anchor.rows.length) return res.status(404).json({ error: 'Not found' });

    const m = anchor.rows[0];

    // Get memories from same user within 30 days either side, ordered by date
    const { rows } = await pool.query(`
        SELECT * FROM memories
        WHERE user_id = $1
        AND date_visited BETWEEN $2::date AND ($2::date + interval '30 days')
        ORDER BY date_visited ASC
        LIMIT 5
    `, [m.user_id, m.date_visited]);

    res.json(rows);
});

app.get('/api/memories/:id', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM memories WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Memory not found' });
    res.json(rows[0]);
});

app.delete('/api/memories/:id', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM memories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
});

// Edit a memory
app.put('/api/memories/:id', requireAuth, upload.single('photo'), async (req, res) => {
    const { location_name, date_visited, what_happened, why_did_you_go, why_was_it_special } = req.body;
    const photo_url = req.file ? req.file.path : undefined;

    const { rows } = await pool.query(
        `UPDATE memories SET
            location_name = $1, date_visited = $2, what_happened = $3,
            why_did_you_go = $4, why_was_it_special = $5
            ${photo_url ? ', photo_url = $7' : ''}
         WHERE id = $6 AND user_id = ${photo_url ? '$8' : '$7'}
         RETURNING *`,
        photo_url
            ? [location_name, date_visited, what_happened, why_did_you_go, why_was_it_special, req.params.id, photo_url, req.user.id]
            : [location_name, date_visited, what_happened, why_did_you_go, why_was_it_special, req.params.id, req.user.id]
    );
    res.json(rows[0]);
});