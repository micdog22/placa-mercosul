# Placa Mercosul: valide e converta placas de veículos brasileiras (JavaScript • Node.js)

Biblioteca sem dependências para validar placas de veículos brasileiras e converter entre o padrão antigo (ABC-1234) e o padrão Mercosul (ABC1D23). Útil em cadastros, sistemas de estacionamento, oficinas e frotas, onde o mesmo carro pode aparecer com a placa antiga ou com a nova. Acompanha uma linha de comando e uma página de demonstração que desenha as duas placas.

**Demonstração online:** https://micdog22.github.io/placa-mercosul/

## Recursos

- Validação dos dois formatos, com o motivo do erro em português ("O 4º caractere deve ser um número.").
- Normalização da entrada: maiúsculas, sem espaços, hífens e pontos.
- Conversão nos dois sentidos, seguindo a tabela oficial do 5º caractere (0→A … 9→J).
- Detecção de placas emitidas já no padrão Mercosul (K a Z no 5º caractere), que não têm versão antiga.
- `equivalentes()` para saber se duas placas são do mesmo veículo ("ABC-1234" e "ABC1C34").
- Expressões regulares prontas para usar.
- CLI `placa`, com saída em JSON e conversão em lote pela entrada padrão.

## Instalação

```bash
npm install github:micdog22/placa-mercosul
```

## Como usar

```js
import {
  normalizar, validar, formatar, tipo, paraMercosul, paraAntiga,
  ehConvertivel, equivalentes, analisar,
} from 'placa-mercosul';

normalizar(' abc-1234 ');  // 'ABC1234'
validar('abc-1234');       // { valida: true, formato: 'antiga', placa: 'ABC1234', motivo: null }
validar('AB-123');         // { valida: false, formato: null, placa: 'AB123',
                           //   motivo: 'A placa deve ter 7 caracteres (letras e números); foram informados 5.' }
tipo('ABC1D23');           // 'mercosul'
formatar('abc1234');       // 'ABC-1234'

paraMercosul('ABC-1234');  // 'ABC1C34'
paraAntiga('ABC1C34');     // 'ABC1234'
paraAntiga('ABC1K34');     // null: emitida já no padrão Mercosul
ehConvertivel('ABC1K34');  // false
equivalentes('ABC-1234', 'abc1c34'); // true
```

As funções de conversão devolvem a placa normalizada, sem separador. Para exibir, use `formatar()`: `formatar(paraAntiga('ABC1C34'))` resulta em `'ABC-1234'`. Placas inválidas resultam em `null` (ou `false`, em `ehConvertivel` e `equivalentes`).

`analisar()` reúne tudo e explica por que falta alguma versão:

```js
analisar('ABC1K34');
// {
//   entrada: 'ABC1K34', valida: true, formato: 'mercosul', placa: 'ABC1K34',
//   formatada: 'ABC1K34', antiga: null, mercosul: 'ABC1K34', convertivel: false,
//   motivo: 'Placa emitida diretamente no padrão Mercosul: a letra K na 5ª posição não
//            corresponde a nenhum número, então não existe versão no padrão antigo.'
// }
```

Expressões regulares exportadas (para placas já normalizadas): `REGEX_ANTIGA`, `REGEX_MERCOSUL` e `REGEX_PLACA` (qualquer um dos dois). A tabela de conversão está em `TABELA_CONVERSAO`.

### Linha de comando

```bash
npx placa ABC-1234
# Placa ABC-1234 (padrão antigo)
#   Padrão antigo:   ABC-1234
#   Padrão Mercosul: ABC1C34

npx placa ABC1K34
# Placa ABC1K34 (padrão Mercosul)
#   Padrão antigo:   não existe (placa emitida diretamente no padrão Mercosul)
#   Padrão Mercosul: ABC1K34

npx placa abc1c34 --json
npx placa --mercosul < placas.txt > placas-mercosul.txt
```

Opções: `--json`, `--mercosul` (só a versão Mercosul), `--antiga` (só a versão antiga), `--help` e `--version`. Sem placas na linha de comando, a CLI lê uma placa por linha da entrada padrão; com `--mercosul` e `--antiga`, a saída tem uma linha por placa (vazia quando não há resultado), o que facilita converter planilhas e listas. O código de saída é 0 quando tudo deu certo, 1 quando alguma placa é inválida (ou não tem versão antiga, com `--antiga`) e 2 em erro de uso.

## Como rodar localmente

```bash
node bin/placa.js ABC-1234
```

Para abrir a página de demonstração, sirva a pasta do projeto e acesse http://localhost:8000 (módulos ES não carregam via `file://`):

```bash
python3 -m http.server 8000
```

## Testes

```bash
npm test
```

## Como funciona

| Padrão | Formato | Exibição |
| --- | --- | --- |
| Antigo | 3 letras e 4 números (`LLLNNNN`) | ABC-1234 |
| Mercosul | 3 letras, número, letra, 2 números (`LLLNLNN`) | ABC1D23 |

Na migração para o padrão Mercosul só o 5º caractere muda: o segundo número da placa antiga vira uma letra.

| Número | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Letra | A | B | C | D | E | F | G | H | I | J |

Placas Mercosul com K a Z nessa posição foram emitidas já no padrão novo e não têm versão antiga. A biblioteca não tenta descobrir estado ou cidade: a placa Mercosul não traz essa informação e as faixas de letras das placas antigas não são uma fonte confiável.

A validação confere apenas o formato. Ela não consulta o Detran nem garante que a placa exista.

## Contribuindo

Issues e pull requests são bem-vindos.

## Licença

MIT. Veja [LICENSE](LICENSE).
