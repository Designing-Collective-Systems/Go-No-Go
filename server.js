// =========================================================
//                      HALT — SERVER
// =========================================================

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path     = require('path');

const app  = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));



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
    ],
    TUTORIAL_ENABLED: true,
    NOGO_HOLD_DURATION: 5000,
    PENDING_PROMPT_TEXT: 'Hold...',
    SKIP_ON_LATE_RELEASE: false,
    SKIP_ON_FAILED_INHIBITION: false,
    SHOW_ERROR_LATE_RELEASE: true,
    SHOW_ERROR_FAILED_INHIBITION: true,
    MULTITOUCH_ENABLED: false,
    MULTITOUCH_MESSAGE: 'Please use only one finger on the screen.',
    INSTRUCTION_TEXTS: {
        overview: {
            title: 'How This Task Works',
            message: 'You\'ll press and hold a blue circle on the screen. You\'ll need to lift your finger when you see <strong>&quot;LIFT&quot;</strong> — then wait for a prompt before pressing again. You\'ll need to keep holding when you see <strong>&quot;HOLD&quot;</strong>.',
            buttonText: 'Got it, let\'s start!'
        },
        go: {
            title: 'Learning LIFT Trials',
            message: 'You\'ll see a blue circle on the screen. When the word <strong>&quot;LIFT&quot;</strong> appears above the circle, lift your finger off the button as quickly as possible. Then wait — a prompt will appear saying &quot;HOLD&quot;. Press the circle again as fast as you can only when you see that prompt.',
            buttonText: 'Ready to try it!'
        },
        noGo: {
            title: 'Learning HOLD Trials',
            message: 'Great job! Now when you see <strong>&quot;HOLD&quot;</strong> appear above the circle, keep holding the circle. Do NOT lift your finger.',
            buttonText: 'Ready to try it!'
        },
        complete: {
            title: 'Tutorial Complete!',
            message: 'Excellent work! You now understand both <strong>LIFT</strong> and <strong>HOLD</strong> trials.<br>Ready to start practicing?',
            buttonText: 'Start Practice'
        },
        static: {
            title: 'How This Task Works',
            body: '<p class="text-lg mb-4">You\'ll press and hold a blue circle on the screen.</p><p class="text-lg mb-4">When <strong>&quot;LIFT&quot;</strong> appears, lift your finger off the button as quickly as possible. Then wait for a prompt before pressing the circle again.</p><p class="text-lg mb-4">When <strong>&quot;HOLD&quot;</strong> appears, keep holding the circle. Do NOT lift your finger.</p><p class="text-lg mb-8">React as fast as you can while following the correct instruction.</p>',
            buttonText: 'Got it!'
        }
    }
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

// Deep-merge stored config over DEFAULT_CONFIG so any field added in a newer
// version of the server fills in with its default value even when the DB row
// was saved before that field existed.
function mergeWithDefaults(stored) {
    const out = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (!stored || typeof stored !== 'object') return out;
    for (const key of Object.keys(DEFAULT_CONFIG)) {
        const def = DEFAULT_CONFIG[key];
        const val = stored[key];
        if (val == null) continue;
        // For nested plain objects (like INSTRUCTION_TEXTS), merge one level deeper
        if (def && typeof def === 'object' && !Array.isArray(def) && typeof val === 'object' && !Array.isArray(val)) {
            out[key] = {};
            for (const k2 of Object.keys(def)) {
                out[key][k2] = (val[k2] != null && typeof def[k2] === 'object' && !Array.isArray(def[k2]))
                    ? Object.assign({}, def[k2], val[k2])
                    : (val[k2] != null ? val[k2] : def[k2]);
            }
            // Preserve any extra keys the user added
            for (const k2 of Object.keys(val)) {
                if (!(k2 in out[key])) out[key][k2] = val[k2];
            }
        } else {
            out[key] = val;
        }
    }
    return out;
}

// ─── PUBLIC ROUTES ────────────────────────────────────────

app.get('/api/config', async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM halt_config WHERE key = 'task_config'");
        res.json(result.rowCount > 0 ? mergeWithDefaults(result.rows[0].value) : DEFAULT_CONFIG);
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

// ─── ADMIN DATA ROUTES ───────────────────────────────────

app.get('/api/admin/config', async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM halt_config WHERE key = 'task_config'");
        res.json(result.rowCount > 0 ? mergeWithDefaults(result.rows[0].value) : DEFAULT_CONFIG);
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.post('/api/admin/config', async (req, res) => {
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


// Participant list with summary stats per participant
app.get('/api/admin/participants', async (req, res) => {
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
app.get('/api/admin/participant/:pid', async (req, res) => {
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

// Download CSV for a single participant
app.get('/api/admin/participant/:pid/csv', async (req, res) => {
    const pid = parseInt(req.params.pid);
    if (isNaN(pid)) return res.status(400).json({ error: 'Invalid PID.' });
    try {
        const result = await pool.query(`
            SELECT
                pid, phase,
                block_number, trial_index, trial_in_block,
                trial_type, is_correct, result_type, error_category,
                rt_release_ms, rt_down_ms, response_time_ms,
                anticipatory_press_delay_ms, slip_duration_ms, recontact_time_ms,
                trial_delay_ms, go_prompt_delay_ms, touch_x, touch_y,
                timestamp, stimulus_onset_timestamp, session_start_time
            FROM halt_trials WHERE pid = $1 ORDER BY id
        `, [pid]);
        const headers = [
            'PID','Phase','Block','Trial Index','Trial in Block',
            'Trial Type','Is Correct','Result Type','Error Category',
            'RT-Release (ms)','RT-Down (ms)','Response Time (ms)',
            'Anticipatory Press Delay (ms)','Slip Duration (ms)','Recontact Time (ms)',
            'Trial Delay (ms)','Go Prompt Delay (ms)','Touch X','Touch Y',
            'Timestamp','Stimulus Onset Timestamp','Session Start Time'
        ];
        let csv = headers.join(',') + '\n';
        for (const r of result.rows) {
            const row = [
                r.pid, r.phase, r.block_number, r.trial_index, r.trial_in_block,
                r.trial_type, r.is_correct, r.result_type, r.error_category,
                r.rt_release_ms, r.rt_down_ms, r.response_time_ms,
                r.anticipatory_press_delay_ms, r.slip_duration_ms, r.recontact_time_ms,
                r.trial_delay_ms, r.go_prompt_delay_ms, r.touch_x, r.touch_y,
                r.timestamp ? new Date(r.timestamp).toISOString() : '',
                r.stimulus_onset_timestamp ? new Date(r.stimulus_onset_timestamp).toISOString() : '',
                r.session_start_time ? new Date(r.session_start_time).toISOString() : ''
            ].map(v => v == null ? '' : String(v));
            csv += row.map(c => c.includes(',') || c.includes('"') ? '"' + c.replace(/"/g,'""') + '"' : c).join(',') + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="halt-pid-${pid}.csv"`);
        res.send(csv);
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

// Download CSV for ALL participants
app.get('/api/admin/export-csv', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                pid, phase,
                block_number, trial_index, trial_in_block,
                trial_type, is_correct, result_type, error_category,
                rt_release_ms, rt_down_ms, response_time_ms,
                anticipatory_press_delay_ms, slip_duration_ms, recontact_time_ms,
                trial_delay_ms, go_prompt_delay_ms, touch_x, touch_y,
                timestamp, stimulus_onset_timestamp, session_start_time
            FROM halt_trials ORDER BY pid, id
        `);
        const headers = [
            'PID','Phase','Block','Trial Index','Trial in Block',
            'Trial Type','Is Correct','Result Type','Error Category',
            'RT-Release (ms)','RT-Down (ms)','Response Time (ms)',
            'Anticipatory Press Delay (ms)','Slip Duration (ms)','Recontact Time (ms)',
            'Trial Delay (ms)','Go Prompt Delay (ms)','Touch X','Touch Y',
            'Timestamp','Stimulus Onset Timestamp','Session Start Time'
        ];
        let csv = headers.join(',') + '\n';
        for (const r of result.rows) {
            const row = [
                r.pid, r.phase, r.block_number, r.trial_index, r.trial_in_block,
                r.trial_type, r.is_correct, r.result_type, r.error_category,
                r.rt_release_ms, r.rt_down_ms, r.response_time_ms,
                r.anticipatory_press_delay_ms, r.slip_duration_ms, r.recontact_time_ms,
                r.trial_delay_ms, r.go_prompt_delay_ms, r.touch_x, r.touch_y,
                r.timestamp ? new Date(r.timestamp).toISOString() : '',
                r.stimulus_onset_timestamp ? new Date(r.stimulus_onset_timestamp).toISOString() : '',
                r.session_start_time ? new Date(r.session_start_time).toISOString() : ''
            ].map(v => v == null ? '' : String(v));
            csv += row.map(c => c.includes(',') || c.includes('"') ? '"' + c.replace(/"/g,'""') + '"' : c).join(',') + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="halt-all-participants.csv"');
        res.send(csv);
    } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
    .then(() => app.listen(PORT, () => console.log(`HALT server running on port ${PORT}`)))
    .catch(err => { console.error('Failed to init DB:', err); process.exit(1); });