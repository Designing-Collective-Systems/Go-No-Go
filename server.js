// =========================================================
//                      HALT — SERVER
//  Serves static files and handles all database operations.
//  Requires: DATABASE_URL environment variable (PostgreSQL).
// =========================================================

require('dotenv').config();
const express = require('express');
const { Pool }  = require('pg');
const path      = require('path');

const app  = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));   // serves index.html, css/, js/

// ─── DB INIT ────────────────────────────────────────────
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS halt_trials (
            id                          SERIAL PRIMARY KEY,
            pid                         INTEGER      NOT NULL,
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
    console.log('DB ready — halt_trials table exists.');
}

// ─── ROUTES ─────────────────────────────────────────────

// Returns the next PID (MAX existing + 1, or 1 if table is empty).
app.get('/api/next-pid', async (req, res) => {
    try {
        const result  = await pool.query('SELECT MAX(pid) AS max_pid FROM halt_trials');
        const maxPid  = result.rows[0].max_pid;
        const nextPid = (maxPid != null) ? maxPid + 1 : 1;
        res.json({ pid: nextPid });
    } catch (err) {
        console.error('next-pid error:', err);
        res.status(500).json({ error: 'Database error fetching PID.' });
    }
});

// Saves all trials for a completed real session in a single transaction.
app.post('/api/save-session', async (req, res) => {
    const { pid, trials } = req.body;

    if (!pid || !Array.isArray(trials) || trials.length === 0) {
        return res.status(400).json({ error: 'Invalid payload.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const t of trials) {
            await client.query(
                `INSERT INTO halt_trials (
                    pid, phase, block_number, trial_index, trial_in_block,
                    trial_type, is_correct, result_type, error_category,
                    rt_release_ms, rt_down_ms, response_time_ms,
                    anticipatory_press_delay_ms, slip_duration_ms, recontact_time_ms,
                    trial_delay_ms, go_prompt_delay_ms,
                    touch_x, touch_y,
                    timestamp, stimulus_onset_timestamp, session_start_time
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                    $13,$14,$15,$16,$17,$18,$19,$20,$21,$22
                )`,
                [
                    pid,
                    t.phase                  ?? null,
                    t.blockNumber            ?? null,
                    t.trialIndex             ?? null,
                    t.trialInBlock           ?? null,
                    t.trialType              ?? null,
                    t.isCorrect              ?? null,
                    t.resultType             ?? null,
                    t.errorCategory          ?? null,
                    t.rtRelease              ?? t.rt        ?? null,
                    t.rtDown                 ?? null,
                    t.responseTime           ?? null,
                    t.anticipatoryPressDelay ?? null,
                    t.slipDuration           ?? null,
                    t.recontactTime          ?? null,
                    t.trialDelay             ?? null,
                    t.goPromptDelay          ?? null,
                    t.touchX                 ?? null,
                    t.touchY                 ?? null,
                    t.timestamp              ?? null,
                    t.stimulusOnsetTimestamp ?? null,
                    t.sessionStartTime       ?? null,
                ]
            );
        }

        await client.query('COMMIT');
        console.log(`Saved ${trials.length} trials for pid=${pid}`);
        res.json({ success: true, pid, count: trials.length });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('save-session error:', err);
        res.status(500).json({ error: 'Database error saving session.' });
    } finally {
        client.release();
    }
});

// ─── START ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
    .then(() => app.listen(PORT, () => console.log(`HALT server running on port ${PORT}`)))
    .catch(err => { console.error('Failed to init DB:', err); process.exit(1); });
