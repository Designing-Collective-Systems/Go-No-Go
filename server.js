// =========================================================
//                      HALT — SERVER
// =========================================================

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const path     = require('path');

const app  = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// ─── SESSION STORE ────────────────────────────────────────
// Token -> expiry timestamp (ms). Restarting the server invalidates all sessions.
const sessions = new Map();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function isValidToken(token) {
    if (!token || !sessions.has(token)) return false;
    if (Date.now() > sessions.get(token)) { sessions.delete(token); return false; }
    return true;
}

function auth(req, res, next) {
    if (!isValidToken(req.headers['x-admin-token'])) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    next();
}

// ─── DEFAULT CONFIG ───────────────────────────────────────
const DEFAULT_CONFIG = {
    NUM_BLOCKS: 2,
    GO_PER_BLOCK: 15,
    NOGO_PER_BLOCK: 5,
    BLOCK_TRIAL_TYPES: [
        'go','go','nogo','go','go','go','nogo','go','go','go',
        'nogo','go','go','nogo','go','go','go','nogo','go','go'
    ],
    BLOCK_STIM_DELAYS: [
        2000,3000,2500,1500,3000,2000,2500,1500,3000,2000,
        2500,1500,3000,2000,2500,1500,3000,2000,2500,1500
    ],
    BLOCK_PROMPT_DELAYS: [
        1000,1500,1000,1000,1000,1500,1000,1000,1500,1000,
        1000,1500,1000,1000,1500,1000,1000,1000,1500,1000
    ],
    BLOCK_X_FACTORS: [
        0,0.4,-0.4,0.6,-0.6,0.2,-0.2,0.8,-0.8,0,
        0.3,-0.3,0.5,-0.5,0.7,-0.7,0.1,-0.1,0.4,-0.4
    ],
    BLOCK_Y_FACTORS: [
        0,0.4,-0.4,-0.6,0.6,-0.2,0.2,-0.8,0.8,0,
        -0.3,0.3,-0.5,0.5,-0.7,0.7,-0.1,0.1,-0.4,0.4
    ],
    PRACTICE_SEQUENCE: [
        { type: 'go',   delay: 3000, goPromptDelay: 2000, xFactor: 0,    yFactor: 0    },
        { type: 'go',   delay: 3000, goPromptDelay: 2500, xFactor: -0.5, yFactor: 0.5  },
        { type: 'nogo', delay: 3000, goPromptDelay: 2000, xFactor: 0.5,  yFactor: -0.5 }
    ]
};

// ─── DB INIT ──────────────────────────────────────────────
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS halt_trials (
            id                          SERIAL PRIMARY KEY,
            pid                         INTEGER NOT NULL,
            phase                       TEXT,
            block_number                INTEGER,
            trial_index                 INTEGER,
            trial_in_block              INTEGER,
            trial_type                  TEXT,
            is_correct                  BOOLEAN,
            result_type                 TEXT,
            error_category              TEXT,
            rt_release_ms               INTEGER,
            rt_down_ms                  INTEGER,
            response_time_ms            INTEGER,
            anticipatory_press_delay_ms INTEGER,
            slip_duration_ms            INTEGER,
            recontact_time_ms           INTEGER,
            trial_delay_ms              INTEGER,
            go_prompt_delay_ms          INTEGER,
            touch_x                     INTEGER,
            touch_y                     INTEGER,
            timestamp                   TIMESTAMPTZ,
            stimulus_onset_timestamp    TIMESTAMPTZ,
            session_start_time          TIMESTAMPTZ
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS halt_admin (
            id            SERIAL PRIMARY KEY,
            password_hash TEXT NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS halt_config (
            key        TEXT PRIMARY KEY,
            value      JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    // Seed default config on first run
    const cfgCheck = await pool.query("SELECT key FROM halt_config WHERE key = 'task_config'");
    if (cfgCheck.rowCount === 0) {
        await pool.query(
            "INSERT INTO halt_config (key, value) VALUES ('task_config', $1)",
            [JSON.stringify(DEFAULT_CONFIG)]
        );
        console.log('Default task config seeded.');
    }

    console.log('DB ready.');
}

// ─── PUBLIC ROUTES ────────────────────────────────────────

app.get('/api/config', async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM halt_config WHERE key = 'task_config'");
        res.json(result.rowCount > 0 ? result.rows[0].value : DEFAULT_CONFIG);
    } catch (err) {
        console.error('config error:', err);
        res.json(DEFAULT_CONFIG); // fall back on error so task still loads
    }
});

app.get('/api/next-pid', async (req, res) => {
    try {
        const result = await pool.query('SELECT MAX(pid) AS max_pid FROM halt_trials');
        const maxPid = result.rows[0].max_pid;
        res.json({ pid: (maxPid != null) ? maxPid + 1 : 1 });
    } catch (err) {
        console.error('next-pid error:', err);
        res.status(500).json({ error: 'Database error fetching PID.' });
    }
});

app.post('/api/save-trial', async (req, res) => {
    const { pid, trial: t } = req.body;
    if (!pid || !t) return res.status(400).json({ error: 'Invalid payload.' });
    try {
        await pool.query(
            `INSERT INTO halt_trials (
                pid, phase, block_number, trial_index, trial_in_block,
                trial_type, is_correct, result_type, error_category,
                rt_release_ms, rt_down_ms, response_time_ms,
                anticipatory_press_delay_ms, slip_duration_ms, recontact_time_ms,
                trial_delay_ms, go_prompt_delay_ms, touch_x, touch_y,
                timestamp, stimulus_onset_timestamp, session_start_time
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
            [
                pid,
                t.phase ?? null, t.blockNumber ?? null, t.trialIndex ?? null, t.trialInBlock ?? null,
                t.trialType ?? null, t.isCorrect ?? null, t.resultType ?? null, t.errorCategory ?? null,
                t.rtRelease ?? t.rt ?? null, t.rtDown ?? null, t.responseTime ?? null,
                t.anticipatoryPressDelay ?? null, t.slipDuration ?? null, t.recontactTime ?? null,
                t.trialDelay ?? null, t.goPromptDelay ?? null, t.touchX ?? null, t.touchY ?? null,
                t.timestamp ?? null, t.stimulusOnsetTimestamp ?? null, t.sessionStartTime ?? null
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('save-trial error:', err);
        res.status(500).json({ error: 'Database error saving trial.' });
    }
});

// ─── ADMIN AUTH ───────────────────────────────────────────

app.get('/api/admin/has-password', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS cnt FROM halt_admin');
        res.json({ hasPassword: parseInt(result.rows[0].cnt) > 0 });
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

// Only works when no password exists yet
app.post('/api/admin/setup', async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    try {
        const existing = await pool.query('SELECT COUNT(*) AS cnt FROM halt_admin');
        if (parseInt(existing.rows[0].cnt) > 0)
            return res.status(403).json({ error: 'Password already set.' });
        const hash = await bcrypt.hash(password, 12);
        await pool.query('INSERT INTO halt_admin (password_hash) VALUES ($1)', [hash]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required.' });
    try {
        const result = await pool.query('SELECT password_hash FROM halt_admin LIMIT 1');
        if (result.rowCount === 0)
            return res.status(403).json({ error: 'No admin account set up yet.' });
        const match = await bcrypt.compare(password, result.rows[0].password_hash);
        if (!match) return res.status(401).json({ error: 'Incorrect password.' });
        const token = generateToken();
        sessions.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8-hour session
        res.json({ token });
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.post('/api/admin/logout', (req, res) => {
    sessions.delete(req.headers['x-admin-token']);
    res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
    res.json({ valid: isValidToken(req.headers['x-admin-token']) });
});

// ─── ADMIN DATA ROUTES (auth required) ───────────────────

app.get('/api/admin/config', auth, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM halt_config WHERE key = 'task_config'");
        res.json(result.rowCount > 0 ? result.rows[0].value : DEFAULT_CONFIG);
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.post('/api/admin/config', auth, async (req, res) => {
    const cfg = req.body;
    if (!cfg || typeof cfg !== 'object') return res.status(400).json({ error: 'Invalid config.' });
    try {
        await pool.query(
            `INSERT INTO halt_config (key, value, updated_at) VALUES ('task_config', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [JSON.stringify(cfg)]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.post('/api/admin/password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    try {
        const result = await pool.query('SELECT password_hash FROM halt_admin LIMIT 1');
        if (result.rowCount === 0) return res.status(500).json({ error: 'No admin account found.' });
        const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
        const hash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE halt_admin SET password_hash = $1', [hash]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

// Participant list with summary stats per participant
app.get('/api/admin/participants', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                pid,
                COUNT(*)                                              AS trial_count,
                COUNT(*) FILTER (WHERE phase = 'Real Study')         AS real_trial_count,
                MIN(session_start_time)                              AS session_date,
                ROUND(AVG(rt_release_ms) FILTER (
                    WHERE phase = 'Real Study' AND trial_type = 'go'
                    AND rt_release_ms IS NOT NULL
                ))                                                    AS mean_rt_release,
                ROUND(100.0 * COUNT(*) FILTER (
                    WHERE phase = 'Real Study' AND is_correct = true AND trial_type != 'pending'
                ) / NULLIF(COUNT(*) FILTER (
                    WHERE phase = 'Real Study' AND trial_type != 'pending'
                ), 0), 1)                                            AS accuracy_pct
            FROM halt_trials
            GROUP BY pid
            ORDER BY pid
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

// All trials for one participant — camelCase keys match dashboard expectations
app.get('/api/admin/participant/:pid', auth, async (req, res) => {
    const pid = parseInt(req.params.pid);
    if (isNaN(pid)) return res.status(400).json({ error: 'Invalid PID.' });
    try {
        const result = await pool.query(`
            SELECT
                pid, phase,
                block_number                AS "blockNumber",
                trial_index                 AS "trialIndex",
                trial_in_block              AS "trialInBlock",
                trial_type                  AS "trialType",
                is_correct                  AS "isCorrect",
                result_type                 AS "resultType",
                error_category              AS "errorCategory",
                rt_release_ms               AS "rtRelease",
                rt_down_ms                  AS "rtDown",
                response_time_ms            AS "responseTime",
                anticipatory_press_delay_ms AS "anticipatoryPressDelay",
                slip_duration_ms            AS "slipDuration",
                recontact_time_ms           AS "recontactTime",
                trial_delay_ms              AS "trialDelay",
                go_prompt_delay_ms          AS "goPromptDelay",
                touch_x                     AS "touchX",
                touch_y                     AS "touchY",
                timestamp,
                stimulus_onset_timestamp    AS "stimulusOnsetTimestamp",
                session_start_time          AS "sessionStartTime"
            FROM halt_trials WHERE pid = $1 ORDER BY id
        `, [pid]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
    .then(() => app.listen(PORT, () => console.log(`HALT server running on port ${PORT}`)))
    .catch(err => { console.error('Failed to init DB:', err); process.exit(1); });