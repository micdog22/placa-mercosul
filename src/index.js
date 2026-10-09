/**
 * Placa Mercosul: valida e converte placas de veículos brasileiras.
 *
 * Padrão antigo:   LLLNNNN  (exibido como ABC-1234)
 * Padrão Mercosul: LLLNLNN  (exibido como ABC1D23)
 *
 * Na conversão, só o 5º caractere muda: o dígito vira letra (0→A, 1→B, ..., 9→J).
 * Placas Mercosul com K a Z nessa posição foram emitidas já no padrão novo e não
 * têm equivalente no padrão antigo.
 */

/** Placa no padrão antigo, já normalizada: ABC1234. */
export const REGEX_ANTIGA = /^[A-Z]{3}[0-9]{4}$/;
/** Placa no padrão Mercosul, já normalizada: ABC1D23. */
export const REGEX_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
/** Qualquer um dos dois padrões, já normalizada. */
export const REGEX_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

/** Letra usada no padrão Mercosul para cada dígito da 5ª posição (índice = dígito). */
export const TABELA_CONVERSAO = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);

/** Maiúsculas, sem espaços, hífens e pontos: " abc-1234 " → "ABC1234". */
export function normalizar(plate) {
  if (typeof plate !== 'string') return '';
  return plate.toUpperCase().replace(/[\s.\-\u2010-\u2015\u2212]/g, '');
}

/**
 * Valida a placa e diz o formato.
 * @returns {{valida: boolean, formato: 'antiga'|'mercosul'|null, placa: string, motivo: string|null}}
 */
export function validar(plate) {
  const p = normalizar(plate);
  const result = (format, reason) => ({ valida: format !== null, formato: format, placa: p, motivo: reason });
  if (typeof plate !== 'string') return result(null, 'Informe a placa como texto, por exemplo "ABC-1234".');
  if (p === '') return result(null, 'Informe a placa.');
  const invalidChar = p.match(/[^A-Z0-9]/u);
  if (invalidChar) {
    return result(null, `Caractere inválido: "${invalidChar[0]}". Use apenas letras de A a Z, sem acento, e números.`);
  }
  if (p.length !== 7) {
    return result(null, `A placa deve ter 7 caracteres (letras e números); foram informados ${p.length}.`);
  }
  if (!/^[A-Z]{3}/.test(p)) return result(null, 'Os três primeiros caracteres devem ser letras.');
  if (!/[0-9]/.test(p[3])) return result(null, 'O 4º caractere deve ser um número.');
  if (!/^[0-9]{2}$/.test(p.slice(5))) return result(null, 'Os dois últimos caracteres devem ser números.');
  return result(/[0-9]/.test(p[4]) ? 'antiga' : 'mercosul', null);
}

/** 'antiga', 'mercosul' ou null quando a placa é inválida. */
export function tipo(plate) {
  return validar(plate).formato;
}

/** Formato de exibição: "ABC-1234" (antiga) ou "ABC1D23" (Mercosul); null se inválida. */
export function formatar(plate) {
  const { formato, placa: p } = validar(plate);
  if (formato === 'antiga') return `${p.slice(0, 3)}-${p.slice(3)}`;
  if (formato === 'mercosul') return p;
  return null;
}

/** Converte para o padrão Mercosul (sem separador). Placas Mercosul voltam como estão; inválidas, null. */
export function paraMercosul(plate) {
  const { formato, placa: p } = validar(plate);
  if (formato === 'antiga') return p.slice(0, 4) + TABELA_CONVERSAO[Number(p[4])] + p.slice(5);
  if (formato === 'mercosul') return p;
  return null;
}

/**
 * Converte para o padrão antigo (sem hífen). Devolve null para placas inválidas e para placas
 * Mercosul com K a Z na 5ª posição, que não têm equivalente; use analisar() para saber o motivo.
 */
export function paraAntiga(plate) {
  const { formato, placa: p } = validar(plate);
  if (formato === 'antiga') return p;
  if (formato === 'mercosul') {
    const digit = TABELA_CONVERSAO.indexOf(p[4]);
    return digit === -1 ? null : p.slice(0, 4) + digit + p.slice(5);
  }
  return null;
}

/** true quando a placa é válida e existe nos dois padrões. */
export function ehConvertivel(plate) {
  return paraAntiga(plate) !== null;
}

/** true quando as duas placas são a mesma, em qualquer padrão: "ABC-1234" e "ABC1C34". */
export function equivalentes(a, b) {
  const mercosul = paraMercosul(a);
  return mercosul !== null && mercosul === paraMercosul(b);
}

/**
 * Tudo sobre a placa de uma vez: formato, as duas versões e o motivo quando falta alguma.
 * @returns {{entrada: string, valida: boolean, formato: 'antiga'|'mercosul'|null, placa: string,
 *   formatada: string|null, antiga: string|null, mercosul: string|null, convertivel: boolean, motivo: string|null}}
 */
export function analisar(plate) {
  const validation = validar(plate);
  const old = paraAntiga(plate);
  let reason = validation.motivo;
  if (validation.valida && old === null) {
    reason =
      `Placa emitida diretamente no padrão Mercosul: a letra ${validation.placa[4]} na 5ª posição ` +
      'não corresponde a nenhum número, então não existe versão no padrão antigo.';
  }
  return {
    entrada: typeof plate === 'string' ? plate : '',
    valida: validation.valida,
    formato: validation.formato,
    placa: validation.placa,
    formatada: formatar(plate),
    antiga: old,
    mercosul: paraMercosul(plate),
    convertivel: old !== null,
    motivo: reason,
  };
}
