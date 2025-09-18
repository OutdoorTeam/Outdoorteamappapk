import fs from 'fs';
import path from 'path';

const inputPath = path.resolve('sql/old_schema_dump.sql');
const outputPath = path.resolve('supabase/migrations/20250918174334_remote_schema.sql');

const sql = fs.readFileSync(inputPath, 'utf8');
const createRe = /CREATE TABLE[\s\S]*?\);/g;
const statements = sql.match(createRe) || [];

const tables = new Map();
const dependencies = new Map();
const normalized = (name) => name.replace(/"/g, '').trim();

for (const stmt of statements) {
  const nameMatch = stmt.match(/CREATE TABLE\s+([\w\.\"]+)/);
  if (!nameMatch) continue;
  const rawName = normalized(nameMatch[1]);
  const tableName = rawName.includes('.') ? rawName : `public.${rawName}`;
  tables.set(tableName, stmt);
  const depMatches = [...stmt.matchAll(/REFERENCES\s+([\w\.\"]+)/g)];
  const deps = new Set();
  for (const match of depMatches) {
    const depRaw = normalized(match[1]);
    const depName = depRaw.includes('.') ? depRaw : `public.${depRaw}`;
    if (depName !== tableName) {
      deps.add(depName);
    }
  }
  dependencies.set(tableName, deps);
}

// Filter dependencies to only those tables we manage
for (const [table, deps] of dependencies) {
  const filtered = new Set();
  for (const dep of deps) {
    if (tables.has(dep)) filtered.add(dep);
  }
  dependencies.set(table, filtered);
}

const dependents = new Map();
for (const table of tables.keys()) {
  dependents.set(table, new Set());
}
for (const [table, deps] of dependencies) {
  for (const dep of deps) {
    if (!dependents.has(dep)) dependents.set(dep, new Set());
    dependents.get(dep).add(table);
  }
}

const indegree = new Map();
for (const table of tables.keys()) {
  indegree.set(table, dependencies.get(table)?.size || 0);
}

const queue = [];
for (const table of tables.keys()) {
  if ((indegree.get(table) || 0) === 0) {
    queue.push(table);
  }
}

const sorted = [];
while (queue.length) {
  const table = queue.shift();
  sorted.push(table);
  for (const dependent of dependents.get(table) || []) {
    indegree.set(dependent, (indegree.get(dependent) || 0) - 1);
    if ((indegree.get(dependent) || 0) === 0) {
      queue.push(dependent);
    }
  }
}

const remaining = [...tables.keys()].filter((table) => !sorted.includes(table));
const finalOrder = [...sorted, ...remaining];

const header = `-- Auto-generated from README schema snapshot\nBEGIN;\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS "pgcrypto";\n`;
const footer = '\nCOMMIT;\n';

const body = finalOrder
  .map((table) => {
    const stmt = tables.get(table);
    return stmt ? `${stmt}\n` : '';
  })
  .join('\n');

fs.writeFileSync(outputPath, header + body + footer, 'utf8');
console.log(`Wrote migration with ${finalOrder.length} tables to ${outputPath}`);
