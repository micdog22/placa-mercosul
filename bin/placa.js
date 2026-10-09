#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { analisar, formatar } from '../src/index.js';

const HELP = `Uso: placa [opções] [placa ...]

Valida placas de veículos brasileiras e converte entre o padrão antigo e o Mercosul.

Exemplos:
  placa ABC-1234            mostra a placa nos dois padrões
  placa abc1c34 --json      resultado em JSON
  placa --mercosul < lista.txt
                            converte uma lista (uma placa por linha) para o Mercosul

Opções:
      --json        saída em JSON
      --mercosul    imprime só a versão Mercosul de cada placa
      --antiga      imprime só a versão no padrão antigo de cada placa
  -h, --help        mostra esta ajuda
  -v, --version     mostra a versão

Sem placas na linha de comando, lê uma placa por linha da entrada padrão.
Código de saída: 0 se tudo estiver certo, 1 se alguma placa for inválida
(ou não puder ser convertida, com --antiga) e 2 em erro de uso.`;

function packageVersion() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
}

function describe(r) {
  const formatName = r.formato === 'antiga' ? 'padrão antigo' : 'padrão Mercosul';
  const old = r.antiga ? formatar(r.antiga) : 'não existe (placa emitida diretamente no padrão Mercosul)';
  return [`Placa ${r.formatada} (${formatName})`, `  Padrão antigo:   ${old}`, `  Padrão Mercosul: ${r.mercosul}`].join('\n');
}

function main(argv) {
  let mode = 'text';
  const plates = [];
  for (const arg of argv) {
    if (!arg.startsWith('-')) {
      plates.push(arg);
      continue;
    }
    switch (arg) {
      case '--json':
      case '--mercosul':
      case '--antiga':
        if (mode !== 'text') {
          console.error('placa: use só uma entre --json, --mercosul e --antiga.');
          return 2;
        }
        mode = arg.slice(2);
        break;
      case '-h':
      case '--help':
        console.log(HELP);
        return 0;
      case '-v':
      case '--version':
        console.log(packageVersion());
        return 0;
      default:
        console.error(`placa: opção desconhecida: ${arg}\nUse "placa --help" para ver as opções.`);
        return 2;
    }
  }

  let inputs = plates;
  if (inputs.length === 0) {
    if (process.stdin.isTTY) {
      console.error(HELP);
      return 2;
    }
    inputs = readFileSync(0, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  const results = inputs.map(analisar);
  let exitCode = results.every((r) => r.valida) ? 0 : 1;

  if (mode === 'json') {
    console.log(JSON.stringify(results.length === 1 && plates.length === 1 ? results[0] : results, null, 2));
    return exitCode;
  }

  const blocks = [];
  for (const r of results) {
    if (!r.valida) {
      console.error(`placa: "${r.entrada}" é inválida. ${r.motivo}`);
      if (mode !== 'text') console.log('');
      continue;
    }
    if (mode === 'mercosul') {
      console.log(r.mercosul);
    } else if (mode === 'antiga') {
      if (r.antiga) {
        console.log(r.antiga);
      } else {
        console.error(`placa: ${r.placa} não tem versão no padrão antigo. ${r.motivo}`);
        console.log('');
        exitCode = 1;
      }
    } else {
      blocks.push(describe(r));
    }
  }
  if (blocks.length) console.log(blocks.join('\n\n'));
  return exitCode;
}

process.exitCode = main(process.argv.slice(2));
