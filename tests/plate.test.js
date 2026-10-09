import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizar,
  validar,
  tipo,
  formatar,
  paraMercosul,
  paraAntiga,
  ehConvertivel,
  equivalentes,
  analisar,
  REGEX_ANTIGA,
  REGEX_MERCOSUL,
  REGEX_PLACA,
  TABELA_CONVERSAO,
} from '../src/index.js';

const MAPPING = [
  ['0', 'A'],
  ['1', 'B'],
  ['2', 'C'],
  ['3', 'D'],
  ['4', 'E'],
  ['5', 'F'],
  ['6', 'G'],
  ['7', 'H'],
  ['8', 'I'],
  ['9', 'J'],
];

describe('tabela de conversão (5º caractere)', () => {
  for (const [digit, letter] of MAPPING) {
    test(`${digit} → ${letter}`, () => {
      assert.equal(paraMercosul(`ABC1${digit}23`), `ABC1${letter}23`);
    });
    test(`${letter} → ${digit}`, () => {
      assert.equal(paraAntiga(`ABC1${letter}23`), `ABC1${digit}23`);
    });
  }
  test('constante exportada', () => {
    assert.deepEqual([...TABELA_CONVERSAO], MAPPING.map(([, letter]) => letter));
    assert.ok(Object.isFrozen(TABELA_CONVERSAO));
  });
  test('só o 5º caractere muda', () => {
    assert.equal(paraMercosul('XYZ9999'), 'XYZ9J99');
    assert.equal(paraMercosul('AAA0000'), 'AAA0A00');
    assert.equal(paraAntiga('QWE7J01'), 'QWE7901');
  });
});

describe('K a Z não têm equivalente antigo', () => {
  for (const letter of 'KLMNOPQRSTUVWXYZ') {
    test(`ABC1${letter}23`, () => {
      const plate = `ABC1${letter}23`;
      assert.equal(validar(plate).valida, true);
      assert.equal(tipo(plate), 'mercosul');
      assert.equal(paraAntiga(plate), null);
      assert.equal(ehConvertivel(plate), false);
      assert.equal(paraMercosul(plate), plate);
      const r = analisar(plate);
      assert.equal(r.convertivel, false);
      assert.equal(r.antiga, null);
      assert.match(r.motivo, new RegExp(`letra ${letter} na 5ª posição`));
      assert.match(r.motivo, /diretamente no padrão Mercosul/);
    });
  }
});

describe('ida e volta', () => {
  test('placas antigas de um bloco inteiro voltam iguais', () => {
    for (let n = 0; n <= 9999; n += 7) {
      const oldPlate = `KMN${String(n).padStart(4, '0')}`;
      const newPlate = paraMercosul(oldPlate);
      assert.match(newPlate, REGEX_MERCOSUL);
      assert.equal(paraAntiga(newPlate), oldPlate);
    }
  });
  test('Mercosul A a J voltam iguais', () => {
    for (const [, letter] of MAPPING) {
      const newPlate = `RIO2${letter}18`;
      assert.equal(paraMercosul(paraAntiga(newPlate)), newPlate);
    }
  });
  test('equivalentes', () => {
    assert.equal(equivalentes('ABC-1234', 'ABC1C34'), true);
    assert.equal(equivalentes('abc 1c34', 'ABC-1234'), true);
    assert.equal(equivalentes('ABC1K34', 'abc1k34'), true);
    assert.equal(equivalentes('ABC-1234', 'ABC1D34'), false);
    assert.equal(equivalentes('ABC-123', 'ABC-123'), false);
  });
});

describe('normalização', () => {
  const cases = [
    ['abc-1234', 'ABC1234'],
    [' ABC 1234 ', 'ABC1234'],
    ['a.b.c.1.2.3.4', 'ABC1234'],
    ['abc\u20131234', 'ABC1234'],
    ['abc\u20141d23', 'ABC1D23'],
    ['ABC\t1D23\n', 'ABC1D23'],
    ['', ''],
  ];
  for (const [input, expected] of cases) {
    test(JSON.stringify(input), () => assert.equal(normalizar(input), expected));
  }
  test('não string vira texto vazio', () => {
    assert.equal(normalizar(null), '');
    assert.equal(normalizar(1234567), '');
  });
});

describe('validar', () => {
  test('padrão antigo', () => {
    assert.deepEqual(validar('ABC-1234'), { valida: true, formato: 'antiga', placa: 'ABC1234', motivo: null });
  });
  test('padrão Mercosul', () => {
    assert.deepEqual(validar('abc1d23'), { valida: true, formato: 'mercosul', placa: 'ABC1D23', motivo: null });
  });
  test('todas as 26 letras valem nas posições de letra', () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      assert.equal(validar(`${letter}${letter}${letter}1234`).valida, true, letter);
      assert.equal(validar(`QQQ1${letter}23`).formato, 'mercosul', letter);
    }
  });

  const invalidCases = [
    ['', /Informe a placa/],
    ['   ', /Informe a placa/],
    ['AB1234', /7 caracteres.*6/],
    ['ABC12345', /7 caracteres.*8/],
    ['ABCD123', /4º caractere deve ser um número/],
    ['1BC1234', /três primeiros caracteres devem ser letras/],
    ['A1C1234', /três primeiros caracteres devem ser letras/],
    ['ABC1D2X', /dois últimos caracteres devem ser números/],
    ['ABC12D3', /dois últimos caracteres devem ser números/],
    ['ABC1DD3', /dois últimos caracteres devem ser números/],
    ['ÁBC1234', /Caractere inválido: "Á"/],
    ['ABC/1234', /Caractere inválido: "\/"/],
    ['ABC_1234', /Caractere inválido: "_"/],
    ['1234567', /três primeiros/],
  ];
  for (const [input, reason] of invalidCases) {
    test(`inválida: ${JSON.stringify(input)}`, () => {
      const r = validar(input);
      assert.equal(r.valida, false);
      assert.equal(r.formato, null);
      assert.match(r.motivo, reason);
      assert.equal(tipo(input), null);
      assert.equal(formatar(input), null);
      assert.equal(paraMercosul(input), null);
      assert.equal(paraAntiga(input), null);
      assert.equal(ehConvertivel(input), false);
    });
  }
  test('tipos que não são texto', () => {
    for (const input of [null, undefined, 1234567, {}, []]) {
      const r = validar(input);
      assert.equal(r.valida, false);
      assert.match(r.motivo, /como texto/);
    }
  });
});

describe('formatar e tipo', () => {
  test('formatos de exibição', () => {
    assert.equal(formatar('abc1234'), 'ABC-1234');
    assert.equal(formatar('ABC 1D23'), 'ABC1D23');
    assert.equal(formatar('abc-1d23'), 'ABC1D23');
  });
  test('tipo', () => {
    assert.equal(tipo('ABC-1234'), 'antiga');
    assert.equal(tipo('ABC1D23'), 'mercosul');
  });
  test('placa já no padrão de destino volta normalizada', () => {
    assert.equal(paraMercosul('abc-1d23'), 'ABC1D23');
    assert.equal(paraAntiga('abc-1234'), 'ABC1234');
  });
  test('ehConvertivel', () => {
    assert.equal(ehConvertivel('ABC-1234'), true);
    assert.equal(ehConvertivel('ABC1J34'), true);
    assert.equal(ehConvertivel('ABC1Z34'), false);
  });
});

describe('expressões regulares exportadas', () => {
  test('aceitam só placas normalizadas', () => {
    assert.ok(REGEX_ANTIGA.test('ABC1234'));
    assert.ok(!REGEX_ANTIGA.test('ABC1D23'));
    assert.ok(!REGEX_ANTIGA.test('ABC-1234'));
    assert.ok(REGEX_MERCOSUL.test('ABC1D23'));
    assert.ok(!REGEX_MERCOSUL.test('ABC1234'));
    assert.ok(REGEX_PLACA.test('ABC1234'));
    assert.ok(REGEX_PLACA.test('ABC1D23'));
    assert.ok(!REGEX_PLACA.test('abc1234'));
    assert.ok(!REGEX_PLACA.test('ABC12D3'));
  });
});

describe('analisar', () => {
  test('placa antiga', () => {
    assert.deepEqual(analisar('abc-1234'), {
      entrada: 'abc-1234',
      valida: true,
      formato: 'antiga',
      placa: 'ABC1234',
      formatada: 'ABC-1234',
      antiga: 'ABC1234',
      mercosul: 'ABC1C34',
      convertivel: true,
      motivo: null,
    });
  });
  test('placa inválida traz o motivo', () => {
    const r = analisar('AB-12');
    assert.equal(r.valida, false);
    assert.equal(r.mercosul, null);
    assert.match(r.motivo, /7 caracteres/);
  });
});
