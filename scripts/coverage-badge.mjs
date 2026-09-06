// Turns Vitest's coverage-summary.json into a shields.io endpoint badge next to the HTML report.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'coverage');
const summary = JSON.parse(readFileSync(resolve(dir, 'coverage-summary.json'), 'utf8'));
const pct = Math.round(summary.total.lines.pct * 10) / 10;
const color = pct >= 90 ? 'brightgreen' : pct >= 80 ? 'green' : pct >= 70 ? 'yellowgreen' : pct >= 60 ? 'yellow' : 'orange';
writeFileSync(resolve(dir, 'badge.json'), JSON.stringify({ schemaVersion: 1, label: 'coverage', message: `${pct}%`, color }));
console.log(`coverage badge: ${pct}% lines (${color})`);
