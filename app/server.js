const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection - MUST use environment variable
const pool = new Pool({
    host: process.env.DB_HOST,  // CRITICAL: From environment
    port: 5432,
    database: 'userdb',
    user: 'postgres',
    password: 'password123'
});

// Wait for database to be ready
async function waitForDB() {
    let retries = 5;
    while (retries > 0) {
        try {
            await pool.query('SELECT 1');
            console.log('Database connected!');
            return;
        } catch (err) {
            console.log(`DB not ready, retrying... (${retries} left)`);
            retries--;
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    throw new Error('Could not connect to database');
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'demo-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');

// Initialize database
async function initDB() {
    await waitForDB();
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
    console.log('Database initialized');
}

// Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query(
        'SELECT * FROM users WHERE username = $1', [username]
    );
    if (result.rows.length > 0) {
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = user;
            return res.redirect('/dashboard');
        }
    }
    res.render('login', { error: 'Invalid credentials' });
});

app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );
        res.redirect('/login');
    } catch (err) {
        res.render('register', { error: 'Username already exists' });
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('dashboard', { user: req.session.user });
});

// Start server after DB is ready
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});

