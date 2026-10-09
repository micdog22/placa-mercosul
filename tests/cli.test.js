import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/placa.js', import.meta.url));

function run(args, stdin) {
  const r = spawnSync(process.execPath, [CLI, ...args], { input: stdin ?? '', encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('mostra os dois padrões', () => {
  const r = run(['ABC-1234']);
  assert.equal(r.code, 0);
  assert.equal(r.stdout, 'Placa ABC-1234 (padrão antigo)\n  Padrão antigo:   ABC-1234\n  Padrão Mercosul: ABC1C34\n');
});

test('placa Mercosul sem equivalente', () => {
  const r = run(['abc1k34']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Placa ABC1K34 \(padrão Mercosul\)/);
  assert.match(r.stdout, /Padrão antigo: {3}não existe/);
});

test('--json com uma placa devolve um objeto', () => {
  const r = run(['ABC1C34', '--json']);
  assert.equal(r.code, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(data.formato, 'mercosul');
  assert.equal(data.antiga, 'ABC1234');
  assert.equal(data.convertivel, true);
});

test('--json pela entrada padrão devolve uma lista', () => {
  const r = run(['--json'], 'ABC1234\nXYZ\n');
  assert.equal(r.code, 1);
  const data = JSON.parse(r.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].mercosul, 'ABC1C34');
  assert.equal(data[1].valida, false);
});

test('lote pela entrada padrão com --mercosul mantém uma linha por placa', () => {
  const r = run(['--mercosul'], 'ABC-1234\n\nPLACA\nRIO2A18\r\n');
  assert.equal(r.code, 1);
  assert.equal(r.stdout, 'ABC1C34\n\nRIO2A18\n');
  assert.match(r.stderr, /"PLACA" é inválida/);
});

test('--antiga avisa quando não existe versão antiga', () => {
  const r = run(['--antiga', 'ABC1C34', 'ABC1Z34']);
  assert.equal(r.code, 1);
  assert.equal(r.stdout, 'ABC1234\n\n');
  assert.match(r.stderr, /ABC1Z34 não tem versão no padrão antigo/);
});

test('placa inválida sai com código 1', () => {
  const r = run(['AB-12']);
  assert.equal(r.code, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /"AB-12" é inválida\. A placa deve ter 7 caracteres/);
});

test('erros de uso saem com código 2', () => {
  assert.equal(run(['--xml', 'ABC1234']).code, 2);
  assert.equal(run(['--json', '--mercosul', 'ABC1234']).code, 2);
});

test('--help e --version', () => {
  assert.match(run(['--help']).stdout, /^Uso: placa/);
  assert.match(run(['-v']).stdout, /^\d+\.\d+\.\d+\n$/);
});
