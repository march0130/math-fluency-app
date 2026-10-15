/**
 * Math Fluency + Working Memory — results collector.
 *
 * Receives finished sessions from training.html, memory-test.html and
 * numberline.html, appends their rows to a Google Sheet, and emails the CSV.
 * Training sessions also add one line per task to a "daily-summary" sheet,
 * which the training page reads back to draw each student's progress charts.
 *
 * Setup is in the project README. In short:
 *   1. Create a Google Sheet, copy its ID out of the URL into SHEET_ID below.
 *   2. script.google.com → New project → paste this file.
 *   3. Deploy → New deployment → Web app
 *        Execute as:        Me
 *        Who has access:    Anyone
 *   4. Copy the /exec URL into config.js as UPLOAD_URL.
 *
 * No student names are collected — only the study ID.
 */

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const TOKEN = 'math-fluency-2026';
const EMAIL_TO = 'chi.ma@utexas.edu';

/* Every session emails a CSV. With 15 students over 15 lessons that is a lot of
 * mail — set this to false and use a daily digest instead (see sendDailyDigest
 * at the bottom) if the inbox gets noisy. The sheet is written either way. */
const EMAIL_EVERY_SESSION = true;

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return reply({ ok: false, error: 'empty request' });
    }

    const payload = JSON.parse(e.postData.contents);
    /* The pre/post test pages sign with TOKEN + '/tests' so that an older
     * deployment of this script, which knew only TOKEN, refuses them. */
    if (payload.token !== TOKEN && payload.token !== TOKEN + '/tests') {
      return reply({ ok: false, error: 'bad token' });
    }

    if (payload.action === 'history') {
      return reply({ ok: true, rows: readHistory(String(payload.id || '')) });
    }

    /* One sheet per task. Anything not on this list is refused rather than
     * creating a stray sheet. */
    const TASKS = ['fraction', 'multiplication', 'memory-test', 'number-line'];
    const task = payload.task;
    if (TASKS.indexOf(task) === -1) {
      return reply({ ok: false, error: 'unknown task' });
    }
    const rows = payload.rows || [];
    if (!rows.length) {
      return reply({ ok: false, error: 'no rows' });
    }

    /* One writer at a time, so two tablets finishing together cannot land on
     * the same row. */
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const sheet = getSheet(task, payload.header || []);
      const width = (payload.header || rows[0]).length;
      const padded = rows.map(function (row) {
        const copy = row.slice(0, width);
        while (copy.length < width) copy.push('');
        return copy;
      });
      appendRows(sheet, padded, width);

      if (payload.summary) {
        const s = payload.summary;
        appendRows(getSheet('daily-summary', SUMMARY_HEADER), [[
          s.id,
          s.sessionStart,
          String(s.sessionStart).slice(0, 10),
          s.lesson,
          s.condition,
          s.task,
          s.highestSpan === null || s.highestSpan === undefined ? '' : s.highestSpan,
          s.accuracy === null || s.accuracy === undefined ? '' : s.accuracy,
          s.items,
          s.correct,
        ]], SUMMARY_HEADER.length);
      }
    } finally {
      lock.releaseLock();
    }

    if (EMAIL_EVERY_SESSION && payload.csv) {
      sendSessionEmail(task, payload);
    }

    return reply({ ok: true, rows: rows.length });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

/* A browser opening the /exec URL directly gets something readable, which makes
 * it easy to confirm the deployment is live. */
function doGet() {
  return reply({ ok: true, service: 'math-fluency collector', version: 3 });
}

const SUMMARY_HEADER = [
  'student_id',
  'session_start',
  'date',
  'lesson',
  'condition',
  'task',
  'highest_span',
  'accuracy',
  'items',
  'items_correct',
];

/* Column A is the student ID in every sheet. It is stored as plain text, so an
 * ID such as 007 is not turned into the number 7; the other columns keep
 * their numbers as numbers. */
function appendRows(sheet, rows, width) {
  if (!rows.length) return;
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, 1).setNumberFormat('@');
  sheet.getRange(start, 1, rows.length, width).setValues(rows);
}

/* Only the daily summary is ever read back, and only one student's lines:
 * a session date, lesson, condition, highest span and accuracy per task. */
function readHistory(id) {
  if (!id) return [];
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('daily-summary');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, SUMMARY_HEADER.length).getValues();
  const text = function (v) {
    return v instanceof Date ? v.toISOString() : v;
  };
  return values
    .filter(function (row) {
      return String(row[0]) === id;
    })
    .map(function (row) {
      return {
        id: String(row[0]),
        sessionStart: text(row[1]),
        lesson: row[3],
        condition: row[4],
        task: row[5],
        highestSpan: row[6],
        accuracy: row[7],
        items: row[8],
        correct: row[9],
      };
    });
}

function getSheet(task, header) {
  const book = SpreadsheetApp.openById(SHEET_ID);
  let sheet = book.getSheetByName(task);
  if (!sheet) {
    sheet = book.insertSheet(task);
  }
  if (sheet.getLastRow() === 0 && header.length) {
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sendSessionEmail(task, payload) {
  const name =
    task +
    '-' +
    payload.id +
    '-lesson' +
    payload.lesson +
    '-' +
    String(payload.startedAt || '').slice(0, 19).replace(/[:T]/g, '-') +
    '.csv';

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject:
      '[' + task + '] ID ' + payload.id + ' · ' +
      (payload.label ? payload.label : 'lesson ' + payload.lesson),
    body:
      'Task: ' + task + '\n' +
      'Student ID: ' + payload.id + '\n' +
      (payload.label ? 'Test: ' + payload.label : 'Lesson: ' + payload.lesson) + '\n' +
      'Condition: ' + payload.condition + '\n' +
      'Started: ' + payload.startedAt + '\n' +
      'Rows: ' + (payload.rows || []).length + '\n\n' +
      'The same rows have been appended to the "' + task + '" sheet.',
    attachments: [
      {
        fileName: name,
        mimeType: 'text/csv',
        content: payload.csv,
      },
    ],
  });
}

/**
 * Optional alternative to per-session mail. Set EMAIL_EVERY_SESSION to false,
 * then add a daily time-driven trigger on this function
 * (Triggers → Add trigger → sendDailyDigest → Time-driven → Day timer).
 */
function sendDailyDigest() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const attachments = [];
  const lines = [];

  ['fraction', 'multiplication', 'memory-test', 'number-line'].forEach(function (task) {
    const sheet = book.getSheetByName(task);
    if (!sheet || sheet.getLastRow() < 2) return;

    const values = sheet.getDataRange().getValues();
    const header = values[0];
    const startedAtCol = header.indexOf('session_start');
    const recent = values.slice(1).filter(function (row) {
      return startedAtCol === -1 || String(row[startedAtCol]) >= since;
    });
    if (!recent.length) return;

    lines.push(task + ': ' + recent.length + ' rows in the last 24 hours');
    attachments.push({
      fileName: task + '-' + since.slice(0, 10) + '.csv',
      mimeType: 'text/csv',
      content: toCsv([header].concat(recent)),
    });
  });

  if (!attachments.length) return;

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: 'Math fluency — daily results',
    body: lines.join('\n'),
    attachments: attachments,
  });
}

function toCsv(rows) {
  return rows
    .map(function (row) {
      return row
        .map(function (value) {
          const text = value === null || value === undefined ? '' : String(value);
          return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
        })
        .join(',');
    })
    .join('\n');
}

function reply(object) {
  return ContentService.createTextOutput(
    JSON.stringify(object)
  ).setMimeType(ContentService.MimeType.JSON);
}
