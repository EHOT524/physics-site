/* Физика ЕГЭ — кабинет репетитора. Работает без сервера: просто откройте index.html. */
(function () {
  'use strict';

  const STORE_KEY = 'fizege.v1';
  const app = document.getElementById('app');

  // ---------- Хранилище ----------
  const defaults = { theme: 'light', mode: 'ege', myTasks: [], students: [], currentStudent: null, lastView: 'theory', lastTheory: {} };
  let S;
  try { S = Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }
  catch (e) { S = Object.assign({}, defaults); }
  if (!S.lastTheory || typeof S.lastTheory !== 'object') S.lastTheory = {};
  if (!MODES[S.mode]) S.mode = 'ege';
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch (e) { toast('Не удалось сохранить данные в браузере'); }
  }

  // ---------- Утилиты ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // ---------- Режимы: 7–11 класс, ОГЭ, ЕГЭ ----------
  const theoryById = id => THEORY.find(s => s.id === id);
  const mode = () => MODES[S.mode];
  // Темы текущего режима в порядке курса: [{id, group, title}]
  function topics() {
    const out = [];
    mode().groups.forEach(g => g.ids.forEach(id => {
      const sec = theoryById(id);
      if (sec) out.push({ id, group: g.title, title: sec.title });
    }));
    return out;
  }
  const topicById = id => topics().find(t => t.id === id) || { id, title: (theoryById(id) || {}).title || id, group: '' };
  const inMode = id => topics().some(t => t.id === id);
  const uid = () => Math.random().toString(36).slice(2, 9);

  function math(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
        strict: false // кириллица в индексах формул (v_{ср}) — это нормально
      });
    }
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2200);
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Перевод LaTeX в читаемый текст — для копирования условия в чат Dotspace/мессенджер
  const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', varepsilon: 'ε', epsilon: 'ε', eta: 'η', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', varphi: 'φ', phi: 'φ', Phi: 'Φ', omega: 'ω', Omega: 'Ω' };
  function plain(html) {
    let s = String(html).replace(/<br\s*\/?>/g, '\n').replace(/<li>/g, '\n• ').replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '');
    s = s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    for (let i = 0; i < 3; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
    s = s.replace(/\\(text|mathrm|mathit|vec|overline)\{([^{}]*)\}/g, '$2');
    s = s.replace(/\\([A-Za-z]+)/g, (m, w) => GREEK[w] || ({ cdot: '·', times: '×', approx: '≈', le: '≤', ge: '≥', ne: '≠', to: '→', circ: '°', degree: '°', infty: '∞', pm: '±' }[w]) || '');
    s = s.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '$1').replace(/[{}$]/g, '').replace(/\\[,;! ]/g, ' ');
    return s.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast('Скопировано — вставьте в чат урока'))
      .catch(() => {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('Скопировано'); } catch (e) { toast('Не удалось скопировать'); }
        ta.remove();
      });
  }

  // ---------- Задачи ----------
  // Порядок как в курсе: по темам, внутри темы сначала часть 1 (сортировка стабильная)
  function poolTasks() { return TASKS.concat((S.myTasks || []).map(t => Object.assign({ mine: true }, t))); }
  // Задачи текущего режима (класса/экзамена)
  function allTasks() {
    const order = topics().map(t => t.id);
    return poolTasks().filter(t => order.includes(t.topic))
      .sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic) || (a.part || 1) - (b.part || 1));
  }
  function taskById(id) { return poolTasks().find(t => t.id === id); }

  function normAnswer(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, '').replace(',', '.'); }
  function checkAnswer(task, given) {
    const a = normAnswer(task.answer), g = normAnswer(given);
    if (!g) return null;
    if (task.anyOrder) return a.split('').sort().join('') === g.split('').sort().join('');
    const na = parseFloat(a), ng = parseFloat(g);
    if (/^-?\d+(\.\d+)?$/.test(a) && /^-?\d+(\.\d+)?$/.test(g)) return Math.abs(na - ng) <= Math.max(1e-9, Math.abs(na) * 1e-6);
    return a === g;
  }

  function student() { return (S.students || []).find(s => s.id === S.currentStudent) || null; }
  function studentMark(taskId) { const st = student(); return st && st.marks ? st.marks[taskId] : undefined; }
  function setMark(taskId, val) {
    const st = student(); if (!st) return;
    st.marks = st.marks || {};
    if (val) st.marks[taskId] = val; else delete st.marks[taskId];
    save();
  }

  function solutionHTML(t) {
    const steps = (t.solution || []).map(s => `<li>${s}</li>`).join('');
    return `<div class="solution">
      ${t.given ? `<p><b>Дано:</b> ${t.given}</p>` : ''}
      ${steps ? `<b>Решение:</b><ol>${steps}</ol>` : '<p class="muted">Решение не добавлено.</p>'}
      ${t.answer ? `<p><b>Ответ:</b> <span class="ans">${esc(t.answer)}${t.unit ? ' ' + esc(t.unit) : ''}</span></p>` : ''}
      ${t.criteria ? `<div class="note"><b>Критерии / на что смотрит эксперт:</b> ${t.criteria}</div>` : ''}
    </div>`;
  }

  function kindLabel(t) {
    if (!mode().exam) return t.part === 2 ? 'Подробное решение' : (t.kind === 'choice' ? 'Выбор / соответствие' : 'Краткий ответ');
    return t.part === 2 ? 'Часть 2 · развёрнутый ответ' : (t.kind === 'choice' ? 'Часть 1 · выбор / соответствие' : 'Часть 1 · краткий ответ');
  }
  const partName = p => mode().exam ? `Часть ${p}` : (p === 1 ? 'Краткий ответ' : 'Подробное решение');

  function taskCard(t, num) {
    const mark = studentMark(t.id);
    const markTag = mark === 'ok' ? '<span class="tag done">решено учеником</span>' : mark === 'bad' ? '<span class="tag" style="color:var(--bad)">ошибка ученика</span>' : '';
    const canCheck = t.part !== 2 && t.answer;
    return `<div class="card task" data-id="${esc(t.id)}">
      <div class="task-head">
        ${num ? `<b>№ ${num}</b>` : ''}
        <span class="tag ${t.part === 2 ? 'p2' : ''}">${kindLabel(t)}</span>
        <span class="tag">${esc(topicById(t.topic).title)}</span>
        ${t.level ? `<span class="tag">${'★'.repeat(t.level)}</span>` : ''}
        ${t.source ? `<span class="tag">${esc(t.source)}</span>` : ''}
        ${t.mine ? '<span class="tag">моя</span>' : ''}
        ${markTag}
      </div>
      <div class="task-text">${t.text}</div>
      <div class="task-actions no-print">
        ${canCheck ? `<span class="answer-row"><input class="ans-input" placeholder="Ответ${t.unit ? ', ' + esc(t.unit) : ''}"><button class="act-check">Проверить</button><span class="verdict"></span></span>` : ''}
        <button class="act-sol">Решение</button>
        <button class="act-board" title="Открыть на весь экран для демонстрации в Dotspace">На доску</button>
        <button class="act-copy" title="Скопировать условие текстом">Копировать</button>
        ${student() ? `<button class="act-ok" title="Отметить: ученик решил">✓</button><button class="act-bad" title="Отметить: ученик ошибся">✗</button>` : ''}
      </div>
      <div class="sol-wrap hidden">${solutionHTML(t)}</div>
    </div>`;
  }

  // Делегирование событий для карточек задач (на любой вкладке)
  let currentList = [];
  app.addEventListener('click', e => {
    const card = e.target.closest('.task'); if (!card) return;
    const t = taskById(card.dataset.id); if (!t) return;
    if (e.target.closest('.act-sol')) {
      const w = $('.sol-wrap', card); w.classList.toggle('hidden'); math(w);
    } else if (e.target.closest('.act-check')) {
      const inp = $('.ans-input', card), v = $('.verdict', card);
      const r = checkAnswer(t, inp.value);
      if (r === null) { v.textContent = ''; return; }
      v.className = 'verdict ' + (r ? 'ok' : 'bad');
      v.textContent = r ? 'Верно!' : 'Неверно';
      if (student()) { setMark(t.id, r ? 'ok' : 'bad'); }
    } else if (e.target.closest('.act-board')) {
      const ids = currentList.length ? currentList : [t.id];
      openBoard(ids, Math.max(0, ids.indexOf(t.id)));
    } else if (e.target.closest('.act-copy')) {
      copy(plain(t.text));
    } else if (e.target.closest('.act-ok')) {
      setMark(t.id, studentMark(t.id) === 'ok' ? null : 'ok'); rerender();
    } else if (e.target.closest('.act-bad')) {
      setMark(t.id, studentMark(t.id) === 'bad' ? null : 'bad'); rerender();
    }
  });
  app.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('ans-input')) $('.act-check', e.target.closest('.task')).click();
  });

  // ---------- Вкладка «Теория» ----------
  function viewTheory(sectionId) {
    // Боковой список: вводный раздел режима (структура экзамена) + темы
    const list = (mode().intro ? [{ id: mode().intro, group: mode().introGroup || 'Обзор', title: theoryById(mode().intro).title }] : []).concat(topics());
    const want = sectionId || S.lastTheory[S.mode];
    const cur = list.find(s => s.id === want) || list[0];
    const sec = theoryById(cur.id);
    S.lastTheory[S.mode] = sec.id; save();
    let side = '', grp = null;
    list.forEach(s => {
      if (s.group !== grp) { grp = s.group; side += `<div class="grp">${esc(grp)}</div>`; }
      side += `<a href="#" data-sec="${s.id}" class="${s.id === sec.id ? 'active' : ''}">${esc(s.title)}</a>`;
    });
    const n = poolTasks().filter(t => t.topic === sec.id).length;
    app.innerHTML = `<div class="split">
      <aside class="side">${side}</aside>
      <section>
        <div class="card theory">
          <h2>${esc(sec.title)}</h2>
          ${sec.html}
          ${n ? `<p class="no-print" style="margin-top:18px"><button class="primary" id="goTasks">Задачи по теме (${n}) →</button></p>` : ''}
        </div>
      </section>
    </div>`;
    $$('.side a', app).forEach(a => a.onclick = ev => { ev.preventDefault(); viewTheory(a.dataset.sec); window.scrollTo(0, 0); });
    const go = $('#goTasks'); if (go) go.onclick = () => { taskFilter.topic = sec.id; taskFilter.part = ''; show('tasks'); };
    math(app);
  }

  // ---------- Вкладка «Задачи» ----------
  const taskFilter = { topic: '', part: '', q: '', status: '' };
  function viewTasks() {
    if (taskFilter.topic && !inMode(taskFilter.topic)) taskFilter.topic = '';
    const opts = topics().map(t => `<option value="${t.id}" ${taskFilter.topic === t.id ? 'selected' : ''}>${esc(t.group)} — ${esc(t.title)}</option>`).join('');
    app.innerHTML = `
      <div class="filters no-print">
        <select id="fTopic"><option value="">Все темы</option>${opts}</select>
        <select id="fPart">
          <option value="">${mode().exam ? 'Обе части' : 'Все типы'}</option>
          <option value="1" ${taskFilter.part === '1' ? 'selected' : ''}>${partName(1)}</option>
          <option value="2" ${taskFilter.part === '2' ? 'selected' : ''}>${partName(2)}</option>
        </select>
        ${student() ? `<select id="fStatus">
          <option value="">Все задачи</option>
          <option value="new" ${taskFilter.status === 'new' ? 'selected' : ''}>Не решал(а)</option>
          <option value="bad" ${taskFilter.status === 'bad' ? 'selected' : ''}>С ошибкой</option>
          <option value="ok" ${taskFilter.status === 'ok' ? 'selected' : ''}>Решено</option>
        </select>` : ''}
        <input type="search" id="fQ" placeholder="Поиск по условию…" value="${esc(taskFilter.q)}">
        <span class="count" id="fCount"></span>
        <button id="boardAll" title="Показать все найденные задачи по очереди на доске">▶ Урок по списку</button>
      </div>
      ${student() ? `<p class="small muted">Ученик: <b>${esc(student().name)}</b> — проверка ответа и кнопки ✓/✗ сохраняют прогресс.</p>` : ''}
      <div id="tList"></div>`;
    const draw = () => {
      const q = taskFilter.q.toLowerCase();
      const list = allTasks().filter(t =>
        (!taskFilter.topic || t.topic === taskFilter.topic) &&
        (!taskFilter.part || String(t.part) === taskFilter.part) &&
        (!q || plain(t.text).toLowerCase().includes(q)) &&
        (!taskFilter.status || !student() || (taskFilter.status === 'new' ? !studentMark(t.id) : studentMark(t.id) === taskFilter.status)));
      currentList = list.map(t => t.id);
      $('#fCount').textContent = `Найдено: ${list.length}`;
      $('#tList').innerHTML = list.map((t, i) => taskCard(t, i + 1)).join('') || '<div class="card muted">Ничего не найдено.</div>';
      math($('#tList'));
    };
    $('#fTopic').onchange = e => { taskFilter.topic = e.target.value; draw(); };
    $('#fPart').onchange = e => { taskFilter.part = e.target.value; draw(); };
    if ($('#fStatus')) $('#fStatus').onchange = e => { taskFilter.status = e.target.value; draw(); };
    $('#fQ').oninput = e => { taskFilter.q = e.target.value; draw(); };
    $('#boardAll').onclick = () => currentList.length && openBoard(currentList, 0);
    draw();
  }

  // ---------- Вкладка «Вариант / ДЗ» ----------
  let variant = null;
  function viewVariant() {
    const checks = topics().map(t => `<label style="display:inline-flex;gap:6px;margin:3px 12px 3px 0"><input type="checkbox" class="vt" value="${t.id}" checked> ${esc(t.title)}</label>`).join('');
    app.innerHTML = `
      <div class="card no-print">
        <h2>Собрать вариант или домашнее задание</h2>
        <p class="muted small">Задачи выбираются случайно из выбранных тем. ${student() ? 'Для ученика <b>' + esc(student().name) + '</b> сначала берутся нерешённые и задачи с ошибками.' : 'Выберите ученика во вкладке «Ученики», чтобы подбирать нерешённые задачи.'}</p>
        <div style="margin:10px 0">${checks}</div>
        <p><button id="vAll">Все темы</button> <button id="vNone">Снять все</button></p>
        <div class="filters">
          <label>${partName(1)}: <input type="number" id="vN1" value="10" min="0" max="60" style="width:70px"></label>
          <label>${partName(2)}: <input type="number" id="vN2" value="3" min="0" max="30" style="width:70px"></label>
          <label>Название: <input id="vTitle" value="${mode().exam ? 'Домашнее задание' : 'Самостоятельная работа'} · ${esc(mode().title)}"></label>
          <button class="primary" id="vMake">Собрать</button>
        </div>
      </div>
      <div id="vOut"></div>`;
    $('#vAll').onclick = () => $$('.vt').forEach(c => c.checked = true);
    $('#vNone').onclick = () => $$('.vt').forEach(c => c.checked = false);
    $('#vMake').onclick = () => {
      const chosen = $$('.vt').filter(c => c.checked).map(c => c.value);
      const pick = (part, n) => {
        const pool = shuffle(allTasks().filter(t => t.part === part && chosen.includes(t.topic)));
        const st = student();
        if (st) pool.sort((a, b) => (studentMark(a.id) === 'ok') - (studentMark(b.id) === 'ok'));
        // порядок как в КИМ: по разделам курса
        const order = topics().map(t => t.id);
        return pool.slice(0, n).sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic));
      };
      variant = { title: $('#vTitle').value || 'Вариант', ids: pick(1, +$('#vN1').value || 0).concat(pick(2, +$('#vN2').value || 0)).map(t => t.id) };
      drawVariant();
    };
    if (variant) drawVariant();
  }
  function drawVariant() {
    const tasks = variant.ids.map(taskById).filter(Boolean);
    currentList = tasks.map(t => t.id);
    const key = tasks.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(topicById(t.topic).title)}</td><td>${t.part === 2 ? 'см. решение' : esc(t.answer) + (t.unit ? ' ' + esc(t.unit) : '')}</td></tr>`).join('');
    $('#vOut').innerHTML = `
      <div class="filters no-print">
        <button class="primary" id="vBoard">▶ Разбирать на уроке</button>
        <button id="vPrint">Печать / PDF</button>
        <button id="vCopy">Скопировать текстом для ученика</button>
        <button id="vKeyToggle">Показать ключ ответов</button>
      </div>
      <h2>${esc(variant.title)}</h2>
      <div class="variant-list">${tasks.map((t, i) => taskCard(t, i + 1)).join('')}</div>
      <div class="card hidden" id="vKey"><h3>Ключ ответов</h3><table class="list"><tr><th>№</th><th>Тема</th><th>Ответ</th></tr>${key}</table></div>`;
    $('#vBoard').onclick = () => tasks.length && openBoard(currentList, 0);
    $('#vPrint').onclick = () => window.print();
    $('#vKeyToggle').onclick = () => { $('#vKey').classList.toggle('hidden'); };
    $('#vCopy').onclick = () => copy(variant.title + '\n\n' + tasks.map((t, i) => `${i + 1}. ${plain(t.text)}`).join('\n\n'));
    math($('#vOut'));
  }

  // ---------- Вкладка «Мои задачи» ----------
  let editing = null;
  function viewMine() {
    const t = editing ? (S.myTasks.find(x => x.id === editing) || {}) : {};
    // Сначала темы текущего режима, ниже — остальные классы/экзамены
    const curIds = topics().map(x => x.id);
    const optList = ids => ids.map(id => `<option value="${id}" ${t.topic === id ? 'selected' : ''}>${esc((theoryById(id) || {}).title || id)}</option>`).join('');
    const others = [];
    Object.keys(MODES).forEach(k => MODES[k].groups.forEach(g => g.ids.forEach(id => {
      if (!curIds.includes(id) && !others.includes(id) && theoryById(id)) others.push(id);
    })));
    const opts = `<optgroup label="${esc(mode().title)}">${optList(curIds)}</optgroup>` + (others.length ? `<optgroup label="Другие темы">${optList(others)}</optgroup>` : '');
    app.innerHTML = `
      <div class="card">
        <h2>${editing ? 'Редактировать задачу' : 'Добавить свою задачу'}</h2>
        <p class="muted small">Сюда удобно переносить задачи из <a href="https://ege.fipi.ru/bank/" target="_blank" rel="noopener">открытого банка ФИПИ</a>: скопируйте условие, укажите номер задания в банке, ответ и своё решение.
        Формулы пишите в LaTeX между знаками доллара: <code>$v = \\frac{s}{t}$</code>. Каждая строка решения — отдельный шаг (удобно открывать по шагам на доске).</p>
        <div class="grid2">
          <div class="form-row"><label>Тема</label><select id="mTopic">${opts}</select></div>
          <div class="form-row"><label>Часть</label><select id="mPart">
            <option value="1" ${t.part !== 2 ? 'selected' : ''}>Краткий ответ (часть 1)</option>
            <option value="2" ${t.part === 2 ? 'selected' : ''}>Развёрнутое решение (часть 2)</option></select></div>
        </div>
        <div class="form-row"><label>Условие</label><textarea id="mText">${esc(t.text ? t.text.replace(/<br>/g, '\n') : '')}</textarea></div>
        <div class="grid2">
          <div class="form-row"><label>Ответ</label><input id="mAns" value="${esc(t.answer || '')}"></div>
          <div class="form-row"><label>Единицы (необязательно)</label><input id="mUnit" value="${esc(t.unit || '')}"></div>
          <div class="form-row"><label>Источник (например, «ФИПИ, код 5A1B2C»)</label><input id="mSrc" value="${esc(t.source || '')}"></div>
          <div class="form-row"><label><input type="checkbox" id="mAny" ${t.anyOrder ? 'checked' : ''}> Цифры ответа в любом порядке (выбор 2 верных)</label></div>
        </div>
        <div class="form-row"><label>Решение — по шагу в строке</label><textarea id="mSol" style="min-height:140px">${esc((t.solution || []).join('\n'))}</textarea></div>
        <p><button class="primary" id="mSave">${editing ? 'Сохранить' : 'Добавить'}</button> ${editing ? '<button id="mCancel">Отмена</button>' : ''}</p>
      </div>
      <div class="filters">
        <h3 style="margin:0">Мои задачи (${S.myTasks.length})</h3>
        <span class="spacer" style="flex:1"></span>
        <button id="mExport">Экспорт в файл</button>
        <label class="small"><button id="mImportBtn">Импорт из файла</button><input type="file" id="mImport" accept=".json" class="hidden"></label>
      </div>
      <div id="mList"></div>`;
    $('#mSave').onclick = () => {
      const text = $('#mText').value.trim();
      if (!text) { toast('Введите условие'); return; }
      const obj = {
        id: editing || 'my-' + uid(), topic: $('#mTopic').value, part: +$('#mPart').value,
        text: text.replace(/\n/g, '<br>'), answer: $('#mAns').value.trim(), unit: $('#mUnit').value.trim(),
        source: $('#mSrc').value.trim(), anyOrder: $('#mAny').checked,
        solution: $('#mSol').value.split('\n').map(s => s.trim()).filter(Boolean)
      };
      if (editing) S.myTasks = S.myTasks.map(x => x.id === editing ? obj : x); else S.myTasks.push(obj);
      editing = null; save(); toast('Сохранено'); viewMine();
    };
    if ($('#mCancel')) $('#mCancel').onclick = () => { editing = null; viewMine(); };
    $('#mExport').onclick = () => {
      const blob = new Blob([JSON.stringify(S.myTasks, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'moi-zadachi-fizika.json'; a.click();
    };
    $('#mImportBtn').onclick = () => $('#mImport').click();
    $('#mImport').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => {
        const arr = JSON.parse(txt);
        if (!Array.isArray(arr)) throw new Error();
        const ids = new Set(S.myTasks.map(x => x.id));
        arr.forEach(x => { if (x && x.text) { if (!x.id || ids.has(x.id)) x.id = 'my-' + uid(); S.myTasks.push(x); } });
        save(); toast('Импортировано: ' + arr.length); viewMine();
      }).catch(() => toast('Файл не распознан'));
    };
    const list = S.myTasks.map(x => Object.assign({ mine: true }, x));
    currentList = list.map(x => x.id);
    $('#mList').innerHTML = list.length ? list.map((x, i) => taskCard(x, i + 1).replace('<div class="task-actions no-print">',
      `<div class="task-actions no-print"><button class="m-edit" data-id="${x.id}">Изменить</button><button class="danger m-del" data-id="${x.id}">Удалить</button>`)).join('')
      : '<div class="card muted">Пока пусто. Добавьте задачу через форму выше.</div>';
    $$('.m-edit').forEach(b => b.onclick = () => { editing = b.dataset.id; viewMine(); window.scrollTo(0, 0); });
    $$('.m-del').forEach(b => b.onclick = () => {
      if (!confirm('Удалить задачу?')) return;
      S.myTasks = S.myTasks.filter(x => x.id !== b.dataset.id); save(); viewMine();
    });
    math(app);
  }

  // ---------- Вкладка «Ученики» ----------
  function viewStudents() {
    const rows = (S.students || []).map(st => {
      const m = Object.values(st.marks || {});
      const ok = m.filter(v => v === 'ok').length, bad = m.filter(v => v === 'bad').length;
      return `<tr>
        <td><b>${esc(st.name)}</b>${st.id === S.currentStudent ? ' <span class="tag done">выбран</span>' : ''}</td>
        <td>${ok} ✓ / ${bad} ✗</td>
        <td>
          <button class="s-pick" data-id="${st.id}">${st.id === S.currentStudent ? 'Снять выбор' : 'Выбрать'}</button>
          <button class="s-open" data-id="${st.id}">Прогресс</button>
          <button class="danger s-del" data-id="${st.id}">Удалить</button>
        </td></tr>`;
    }).join('');
    app.innerHTML = `
      <div class="card">
        <h2>Ученики</h2>
        <p class="muted small">Выберите ученика перед уроком — тогда отметки ✓/✗ и проверка ответов будут сохраняться в его прогресс, а вариант/ДЗ будет подбираться из нерешённых задач. Данные хранятся только в этом браузере.</p>
        <div class="filters"><input id="sName" placeholder="Имя ученика"><button class="primary" id="sAdd">Добавить</button></div>
        ${rows ? `<table class="list"><tr><th>Ученик</th><th>Отметки</th><th></th></tr>${rows}</table>` : '<p class="muted">Учеников пока нет.</p>'}
      </div>
      <div id="sDetail"></div>`;
    $('#sAdd').onclick = () => {
      const name = $('#sName').value.trim(); if (!name) return;
      const st = { id: uid(), name, marks: {}, notes: '' };
      S.students.push(st); S.currentStudent = st.id; save(); viewStudents();
    };
    $$('.s-pick').forEach(b => b.onclick = () => { S.currentStudent = S.currentStudent === b.dataset.id ? null : b.dataset.id; save(); viewStudents(); });
    $$('.s-del').forEach(b => b.onclick = () => {
      if (!confirm('Удалить ученика и его прогресс?')) return;
      S.students = S.students.filter(s => s.id !== b.dataset.id);
      if (S.currentStudent === b.dataset.id) S.currentStudent = null;
      save(); viewStudents();
    });
    $$('.s-open').forEach(b => b.onclick = () => drawStudent(b.dataset.id));
    if (S.currentStudent) drawStudent(S.currentStudent);
  }
  function drawStudent(id) {
    const st = S.students.find(s => s.id === id); if (!st) return;
    const marks = st.marks || {};
    const rows = topics().map(tp => {
      const ids = allTasks().filter(t => t.topic === tp.id).map(t => t.id);
      const ok = ids.filter(i => marks[i] === 'ok').length, bad = ids.filter(i => marks[i] === 'bad').length;
      const pct = ids.length ? Math.round(ok / ids.length * 100) : 0;
      return `<tr><td>${esc(tp.title)}</td><td>${ok} / ${ids.length}</td><td>${bad || ''}</td>
        <td style="width:35%"><div style="background:var(--bg);border-radius:6px;height:10px"><div style="width:${pct}%;background:var(--ok);height:10px;border-radius:6px"></div></div></td></tr>`;
    }).join('');
    $('#sDetail').innerHTML = `<div class="card">
      <h3 style="margin-top:0">Прогресс: ${esc(st.name)}</h3>
      <table class="list"><tr><th>Тема</th><th>Решено</th><th>Ошибки</th><th></th></tr>${rows}</table>
      <div class="form-row" style="margin-top:14px"><label>Заметки о ученике (пробелы, планы, ДЗ)</label><textarea id="sNotes">${esc(st.notes || '')}</textarea></div>
    </div>`;
    $('#sNotes').oninput = e => { st.notes = e.target.value; save(); };
  }

  // ---------- Вкладка «Справка» ----------
  function viewRef() {
    app.innerHTML = `<div class="card theory">${REFERENCE}</div>`;
    math(app);
  }

  // ---------- Режим урока (доска) ----------
  const board = { ids: [], i: 0, font: 24 };
  const boardOpen = () => !$('#board').classList.contains('hidden');
  function openBoard(ids, i) {
    board.ids = ids; board.i = i;
    // Доска открывается под верхним меню, чтобы из неё можно было перейти в любой раздел
    $('#board').style.top = $('.topbar').getBoundingClientRect().bottom + 'px';
    if (!boardOpen()) history.pushState({ board: true }, ''); // кнопка «Назад» браузера закрывает доску
    $('#board').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    drawBoard();
  }
  function drawBoard() {
    const t = taskById(board.ids[board.i]); if (!t) return;
    $('#bInfo').textContent = `Задача ${board.i + 1} из ${board.ids.length} · ${topicById(t.topic).title}`;
    const body = $('#bBody');
    body.style.setProperty('--board-font', board.font + 'px');
    body.innerHTML = `<div class="task-text" style="font-size:1em">${t.text}</div><div class="sol-wrap">${solutionHTML(t)}</div>`;
    $$('.solution li', body).forEach(li => li.classList.add('step-hidden'));
    const sol = $('.solution', body);
    $$(':scope > p, :scope > .note', sol).forEach(p => { if (!p.innerHTML.includes('Дано')) p.classList.add('hidden'); });
    $$(':scope > b', sol).forEach(b => b.classList.add('hidden'));
    math(body);
  }
  function revealStep(all) {
    const body = $('#bBody');
    $$('.solution > b', body).forEach(b => b.classList.remove('hidden'));
    const hidden = $$('.solution li.step-hidden', body);
    if (all) hidden.forEach(li => li.classList.remove('step-hidden'));
    else if (hidden.length) hidden[0].classList.remove('step-hidden');
    if (all || hidden.length <= 1) $$('.solution .hidden', body).forEach(p => p.classList.remove('hidden'));
  }
  function hideBoard() { $('#board').classList.add('hidden'); document.body.style.overflow = ''; }
  function closeBoard() {
    if (!boardOpen()) return;
    hideBoard();
    if (history.state && history.state.board) history.back(); // убрать запись, добавленную при открытии
  }
  window.addEventListener('popstate', hideBoard);
  $('#bBack').onclick = closeBoard;
  $('#bPrev').onclick = () => { if (board.i > 0) { board.i--; drawBoard(); } };
  $('#bNext').onclick = () => { if (board.i < board.ids.length - 1) { board.i++; drawBoard(); } };
  $('#bStep').onclick = () => revealStep(false);
  $('#bAll').onclick = () => revealStep(true);
  $('#bClose').onclick = closeBoard;
  $('#bFontPlus').onclick = () => { board.font = Math.min(48, board.font + 2); $('#bBody').style.setProperty('--board-font', board.font + 'px'); };
  $('#bFontMinus').onclick = () => { board.font = Math.max(14, board.font - 2); $('#bBody').style.setProperty('--board-font', board.font + 'px'); };
  document.addEventListener('keydown', e => {
    if ($('#board').classList.contains('hidden')) return;
    if (e.key === 'Escape') closeBoard();
    else if (e.key === 'ArrowRight') $('#bNext').click();
    else if (e.key === 'ArrowLeft') $('#bPrev').click();
    else if (e.key === ' ') { e.preventDefault(); revealStep(false); }
  });

  // ---------- Навигация ----------
  const VIEWS = { theory: () => viewTheory(), tasks: viewTasks, variant: viewVariant, mine: viewMine, students: viewStudents, ref: viewRef };
  function show(v) {
    if (!VIEWS[v]) v = 'theory';
    S.lastView = v; save();
    $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    currentList = [];
    VIEWS[v]();
  }
  function rerender() { show(S.lastView); }
  $$('#nav button').forEach(b => b.onclick = () => { closeBoard(); show(b.dataset.view); window.scrollTo(0, 0); });

  // Переключатель «7 · 8 · 9 · 10 · 11 · ОГЭ · ЕГЭ»
  function drawModes() {
    $('#modes').innerHTML = Object.keys(MODES).map(k =>
      `<button data-mode="${k}" class="${k === S.mode ? 'active' : ''}" title="${esc(MODES[k].title)}">${esc(MODES[k].short)}</button>`).join('');
    $('#brandSub').textContent = mode().title;
    document.title = `Физика · ${mode().title}`;
    $$('#modes button').forEach(b => b.onclick = () => {
      if (b.dataset.mode === S.mode) return;
      closeBoard();
      S.mode = b.dataset.mode; save();
      taskFilter.topic = ''; variant = null; editing = null;
      drawModes(); rerender(); window.scrollTo(0, 0);
    });
  }
  drawModes();

  function applyTheme() { document.documentElement.dataset.theme = S.theme; }
  $('#themeBtn').onclick = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };
  applyTheme();

  // KaTeX подключается с defer — ждём его, чтобы формулы отрисовались
  function start() { show(S.lastView); }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
