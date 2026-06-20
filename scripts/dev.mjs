// Runs the API server and the Vite dev server together. Ctrl-C stops both.
import { spawn } from 'node:child_process';

const procs = [
  { name: 'server', color: '\x1b[35m', cmd: 'npm', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'web   ', color: '\x1b[36m', cmd: 'npm', args: ['--prefix', 'web', 'run', 'dev'] },
];

const children = procs.map((p) => {
  const child = spawn(p.cmd, p.args, { shell: process.platform === 'win32' });
  const tag = (line) => `${p.color}[${p.name}]\x1b[0m ${line}`;
  child.stdout.on('data', (d) => process.stdout.write(d.toString().split('\n').filter(Boolean).map(tag).join('\n') + '\n'));
  child.stderr.on('data', (d) => process.stderr.write(d.toString().split('\n').filter(Boolean).map(tag).join('\n') + '\n'));
  return child;
});

const kill = () => { children.forEach((c) => c.kill('SIGINT')); process.exit(0); };
process.on('SIGINT', kill);
process.on('SIGTERM', kill);

console.log('\x1b[32m▶ API: http://localhost:3000  ·  Web: http://localhost:5173\x1b[0m');
