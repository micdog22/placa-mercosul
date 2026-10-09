import { analisar, formatar } from './src/index.js';

const plateInput = document.getElementById('plate-input');
const status = document.getElementById('status');
const notice = document.getElementById('notice');
const mercosulPlate = document.getElementById('mercosul-plate');
const oldPlate = document.getElementById('old-plate');
const mercosulText = document.getElementById('mercosul-text');
const oldText = document.getElementById('old-text');
const oldCaption = document.getElementById('old-caption');
const copyMercosul = document.getElementById('copy-mercosul');
const copyOld = document.getElementById('copy-old');

const STORAGE_KEY = 'placa-mercosul:ultima';

function write(element, text) {
  const span = document.createElement('span');
  span.textContent = text;
  element.replaceChildren(span);
}

function showStatus(kind, parts) {
  status.className = `status ${kind}`.trim();
  status.replaceChildren(
    ...parts.map((part) => {
      if (typeof part === 'string') return document.createTextNode(part);
      const strong = document.createElement('strong');
      strong.textContent = part.strong;
      return strong;
    }),
  );
}

function draw(plate, textElement, text, label, state) {
  plate.classList.toggle('empty', state === 'empty');
  plate.classList.toggle('missing', state === 'missing');
  write(textElement, text);
  plate.setAttribute('aria-label', label);
}

function update() {
  notice.textContent = '';
  const text = plateInput.value;
  const r = analisar(text);
  const mercosul = r.mercosul;
  const old = r.antiga ? formatar(r.antiga) : null;

  if (!r.valida) {
    if (text.trim() === '') {
      showStatus('', ['Digite uma placa para ver as duas versões.']);
    } else {
      showStatus('error', [{ strong: 'Placa inválida. ' }, r.motivo]);
    }
    draw(mercosulPlate, mercosulText, '•••••••', 'Placa no padrão Mercosul: aguardando uma placa válida', 'empty');
    draw(oldPlate, oldText, '•••-••••', 'Placa no padrão antigo: aguardando uma placa válida', 'empty');
    oldCaption.textContent = 'Padrão antigo';
  } else {
    const format = r.formato === 'antiga' ? 'no padrão antigo' : 'no padrão Mercosul';
    if (old) {
      const other = r.formato === 'antiga' ? `No padrão Mercosul: ${mercosul}.` : `No padrão antigo: ${old}.`;
      showStatus('ok', [{ strong: `Placa válida ${format}. ` }, other]);
    } else {
      showStatus('warning', [{ strong: `Placa válida ${format}. ` }, r.motivo]);
    }
    draw(mercosulPlate, mercosulText, mercosul, `Placa no padrão Mercosul: ${mercosul}`, '');
    if (old) {
      draw(oldPlate, oldText, old, `Placa no padrão antigo: ${old}`, '');
      oldCaption.textContent = 'Padrão antigo';
    } else {
      draw(oldPlate, oldText, 'Sem versão no padrão antigo', 'Esta placa não tem versão no padrão antigo', 'missing');
      oldCaption.textContent = 'Padrão antigo: não existe';
    }
  }
  copyMercosul.disabled = !mercosul;
  copyOld.disabled = !old;
  copyMercosul.dataset.text = mercosul || '';
  copyOld.dataset.text = old || '';

  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    // sem armazenamento local: tudo bem, só não lembra a última placa
  }
}

async function copyPlate(event) {
  const text = event.currentTarget.dataset.text;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    notice.textContent = `${text} copiada.`;
  } catch {
    notice.textContent = `Não deu para copiar automaticamente. A placa é ${text}.`;
  }
}

try {
  const last = localStorage.getItem(STORAGE_KEY);
  if (last) plateInput.value = last;
} catch {
  // segue com o exemplo padrão
}

plateInput.addEventListener('input', update);
copyMercosul.addEventListener('click', copyPlate);
copyOld.addEventListener('click', copyPlate);
document.getElementById('examples').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-plate]');
  if (!button) return;
  plateInput.value = button.dataset.plate;
  update();
  plateInput.focus();
});

update();
