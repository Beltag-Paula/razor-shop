// SQLite access. Uses better-sqlite3 when it is installed (npm install adds it), otherwise Node's built-in node:sqlite.
// Both give the same small API the app uses: exec, pragma, prepare().get/all/run and transaction().
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  const { DatabaseSync } = require('node:sqlite');
  Database = class {
    constructor(file) { this.d = new DatabaseSync(file); this.depth = 0; this.kind = 'node:sqlite'; }
    pragma(text) { this.d.exec(`PRAGMA ${text}`); }
    exec(sql) { this.d.exec(sql); }
    prepare(sql) {
      const st = this.d.prepare(sql);
      return {
        get: (...a) => st.get(...a),
        all: (...a) => st.all(...a),
        run: (...a) => { const r = st.run(...a); return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }; },
      };
    }
    // Runs fn inside BEGIN/COMMIT (ROLLBACK on error). A call made inside another transaction simply joins it.
    transaction(fn) {
      return (...args) => {
        if (this.depth) return fn(...args);
        this.d.exec('BEGIN IMMEDIATE');
        this.depth = 1;
        try { const r = fn(...args); this.d.exec('COMMIT'); return r; }
        catch (e) { this.d.exec('ROLLBACK'); throw e; }
        finally { this.depth = 0; }
      };
    }
  };
}
module.exports = Database;
