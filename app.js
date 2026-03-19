// DB / MockAPI / AppState / Theme / UI

'use strict';

// DB

const DB = (() => {
  const KEY = 'habitosDB';

  const _genHistory = (hitRate) => {
    const hist = {};
    for (let i = 30; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (Math.random() < hitRate) hist[key] = true;
    }
    return hist;
  };

  const _defaultData = () => ({
    users: [
      { id: 1, nombre: 'Demo', email: 'demo@habitos.app', password: 'demo1234' }
    ],
    habitos: [
      { id: 1, titulo: 'Leer 30 minutos',  usuarioId: 1, history: _genHistory(0.75) },
      { id: 2, titulo: 'Meditar 10 min',   usuarioId: 1, history: _genHistory(0.55) },
      { id: 3, titulo: 'Correr o caminar', usuarioId: 1, history: _genHistory(0.45) },
    ],
    nextId: 4
  });

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || _defaultData();
    } catch {
      return _defaultData();
    }
  };

  const save = (data) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
  };

  return { load, save };
})();


// MockAPI

const MockAPI = (() => {
  const TODAY = new Date().toISOString().split('T')[0];
  let _db = DB.load();

  const _persist = () => DB.save(_db);

  const _lastNDays = (n) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return d.toISOString().split('T')[0];
    });

  // Auth
  const login = (email, password) => {
    const user = _db.users.find(u => u.email === email && u.password === password);
    return user ? { ...user } : null;
  };

  const register = (nombre, email, password) => {
    if (_db.users.find(u => u.email === email)) {
      return { error: 'Email ya registrado.' };
    }
    const user = { id: _db.nextId++, nombre, email, password };
    _db.users.push(user);
    _persist();
    return { ...user };
  };

  // Hábitos
  const getHabitos = (usuarioId) =>
    _db.habitos.filter(h => h.usuarioId === usuarioId);

  const crearHabito = (titulo, usuarioId) => {
    const habito = { id: _db.nextId++, titulo, usuarioId, history: {} };
    _db.habitos.push(habito);
    _persist();
    return { ...habito };
  };

  const eliminarHabito = (id) => {
    _db.habitos = _db.habitos.filter(h => h.id !== id);
    _persist();
  };

  const marcarCompletado = (habitoId) => {
    const habito = _db.habitos.find(h => h.id === habitoId);
    if (!habito) return null;
    habito.history[TODAY] = true;
    _persist();
    return { ok: true };
  };

  // Estadísticas
  const getStats = (habitoId) => {
    const habito = _db.habitos.find(h => h.id === habitoId);
    if (!habito) return null;

    const last7  = _lastNDays(7);
    const last30 = _lastNDays(30);

    const pct7  = Math.round((last7.filter(d  => habito.history[d]).length / 7)  * 100);
    const pct30 = Math.round((last30.filter(d => habito.history[d]).length / 30) * 100);

    // Racha actual: días consecutivos hacia atrás desde hoy
    let rachaActual = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (habito.history[d.toISOString().split('T')[0]]) rachaActual++;
      else break;
    }

    // Mejor racha histórica
    const allDays = Object.keys(habito.history).sort();
    let mejorRacha = 0, cur = 0, prev = null;
    for (const day of allDays) {
      if (prev) {
        const diff = (new Date(day) - new Date(prev)) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      if (cur > mejorRacha) mejorRacha = cur;
      prev = day;
    }

    return {
      rachaActual,
      mejorRacha: Math.max(mejorRacha, rachaActual),
      porcentaje7Dias: pct7,
      porcentaje30Dias: pct30,
      last7Flags: last7.map(d => ({ date: d, done: !!habito.history[d], isToday: d === TODAY })),
      completadoHoy: !!habito.history[TODAY]
    };
  };

  return { login, register, getHabitos, crearHabito, eliminarHabito, marcarCompletado, getStats };
})();


// AppState

const AppState = (() => {
  let _usuario = null;

  const getUsuario  = () => _usuario;
  const setUsuario  = (u) => { _usuario = u; };
  const clearUsuario = () => { _usuario = null; };
  const isLoggedIn  = () => _usuario !== null;

  return { getUsuario, setUsuario, clearUsuario, isLoggedIn };
})();


// Theme

const Theme = (() => {
  const apply = (dark) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  const toggle = () => {
    apply(document.documentElement.getAttribute('data-theme') !== 'dark');
  };

  const init = () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(saved ? saved === 'dark' : prefersDark);
  };

  return { init, toggle };
})();


// UI

const UI = (() => {

  // Utilidades

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const el = (id) => document.getElementById(id);

  const showToast = (msg, type = 'success') => {
    const toast = el('toast');
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const setFormMsg = (id, text, type = '') => {
    const node = el(id);
    node.textContent = text;
    node.className = `form-msg${type ? ' ' + type : ''}`;
  };

  // Modal

  let _modalResolve = null;

  const showModal = ({ title, body, confirmLabel = 'Eliminar' }) => {
    el('modal-title').textContent = title;
    el('modal-body').textContent  = body;
    el('btn-modal-confirm').textContent = confirmLabel;
    el('modal-overlay').hidden = false;
    el('btn-modal-confirm').focus();

    return new Promise((resolve) => {
      _modalResolve = resolve;
    });
  };

  const _closeModal = (result) => {
    el('modal-overlay').hidden = true;
    if (_modalResolve) { _modalResolve(result); _modalResolve = null; }
  };

  // Secciones

  const showApp = (usuario) => {
    el('auth-section').style.display = 'none';
    el('app-section').hidden = false;
    el('user-name-display').textContent = usuario.nombre || usuario.email;
    renderHabitos();
  };

  const showAuth = () => {
    el('app-section').hidden = true;
    el('auth-section').style.display = 'grid';
    el('login-email').value    = '';
    el('login-password').value = '';
    setFormMsg('login-msg', '');
    el('btn-login').disabled = false;
  };

  // Dashboard

  const updateDashboard = (habitos, statsArr) => {
    const total      = habitos.length;
    const completados = statsArr.filter(s => s.completadoHoy).length;
    const pct        = total ? Math.round((completados / total) * 100) : 0;

    el('total-habitos').textContent    = total;
    el('completados-hoy').textContent  = completados;
    el('porcentaje-dia').textContent   = `${pct}%`;

    const track = el('progress-track');
    track.setAttribute('aria-valuenow', pct);

    requestAnimationFrame(() => {
      el('progress-bar').style.width = `${pct}%`;
    });
  };

  // Cards

  const _buildCard = (habito, stats, index) => {
    const card = document.createElement('div');
    card.className = 'habito-card' + (stats.completadoHoy ? ' completed-today' : '');
    card.id = `card-${habito.id}`;
    card.setAttribute('role', 'listitem');
    card.style.animationDelay = `${index * 45}ms`;

    const dots = stats.last7Flags.map(f =>
      `<span class="dot${f.done ? (f.isToday ? ' today' : ' done') : ''}" title="${f.date}"></span>`
    ).join('');

    card.innerHTML = `
      <div class="habito-left">
        <div class="habito-title">${esc(habito.titulo)}</div>
        <div class="habito-stats-row">
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.rachaActual}</div>
            <div class="mini-stat-label">Racha</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.mejorRacha}</div>
            <div class="mini-stat-label">Mejor</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.porcentaje7Dias}%</div>
            <div class="mini-stat-label">7 días</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.porcentaje30Dias}%</div>
            <div class="mini-stat-label">30 días</div>
          </div>
          <div class="mini-stat">
            <div class="habit-dots" aria-hidden="true">${dots}</div>
            <div class="mini-stat-label">Última semana</div>
          </div>
        </div>
      </div>
      <div class="habito-actions">
        <button
          class="btn-completar${stats.completadoHoy ? ' done-today' : ''}"
          data-action="completar"
          data-id="${habito.id}"
          ${stats.completadoHoy ? 'disabled aria-disabled="true"' : ''}
          aria-label="${stats.completadoHoy ? 'Ya completado hoy' : `Completar hoy: ${esc(habito.titulo)}`}"
        >
          ${stats.completadoHoy ? 'Completado' : 'Completar hoy'}
        </button>
        <button
          class="btn-eliminar"
          data-action="eliminar"
          data-id="${habito.id}"
          data-titulo="${esc(habito.titulo)}"
          aria-label="Eliminar hábito: ${esc(habito.titulo)}"
        >Eliminar</button>
      </div>
    `;

    return card;
  };

  const renderHabitos = () => {
    const lista   = el('lista-habitos');
    const empty   = el('empty-state');
    const usuario = AppState.getUsuario();

    lista.innerHTML = '';

    const habitos  = MockAPI.getHabitos(usuario.id);
    const statsArr = habitos.map(h => MockAPI.getStats(h.id));

    updateDashboard(habitos, statsArr);

    if (!habitos.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    const fragment = document.createDocumentFragment();
    habitos.forEach((h, i) => fragment.appendChild(_buildCard(h, statsArr[i], i)));
    lista.appendChild(fragment);
  };

  // Actualiza solo la card afectada (sin re-render completo)
  const patchCard = (habitoId) => {
    const habito = MockAPI.getHabitos(AppState.getUsuario().id)
      .find(h => h.id === habitoId);
    if (!habito) return;

    const stats    = MockAPI.getStats(habitoId);
    const oldCard  = el(`card-${habitoId}`);
    if (!oldCard) return;

    const index    = Array.from(oldCard.parentNode.children).indexOf(oldCard);
    const newCard  = _buildCard(habito, stats, index);
    oldCard.replaceWith(newCard);

    const allHabitos  = MockAPI.getHabitos(AppState.getUsuario().id);
    const allStatsArr = allHabitos.map(h => MockAPI.getStats(h.id));
    updateDashboard(allHabitos, allStatsArr);
  };

  // Handlers

  const _handleLogin = () => {
    const email    = el('login-email').value.trim();
    const password = el('login-password').value;

    if (!email || !password) {
      setFormMsg('login-msg', 'Completa todos los campos.', 'error');
      return;
    }

    const btn = el('btn-login');
    btn.disabled = true;
    setFormMsg('login-msg', '');

    setTimeout(() => {
      const user = MockAPI.login(email, password);
      if (user) {
        AppState.setUsuario(user);
        showApp(user);
      } else {
        setFormMsg('login-msg', 'Email o contraseña incorrectos.', 'error');
        btn.disabled = false;
      }
    }, 300);
  };

  const _handleRegister = () => {
    const nombre   = el('register-name').value.trim();
    const email    = el('register-email').value.trim();
    const password = el('register-password').value;

    if (!nombre || !email || !password) {
      setFormMsg('register-msg', 'Completa todos los campos.', 'error');
      return;
    }

    const btn = el('btn-register');
    btn.disabled = true;
    setFormMsg('register-msg', '');

    setTimeout(() => {
      const result = MockAPI.register(nombre, email, password);
      if (result.error) {
        setFormMsg('register-msg', result.error, 'error');
        btn.disabled = false;
      } else {
        setFormMsg('register-msg', 'Cuenta creada. Puedes entrar ahora.', 'ok');
        ['register-name', 'register-email', 'register-password']
          .forEach(id => { el(id).value = ''; });
        setTimeout(() => document.querySelector('[data-tab="login"]').click(), 1200);
        btn.disabled = false;
      }
    }, 300);
  };

  const _handleCrearHabito = () => {
    const input  = el('habito-titulo');
    const titulo = input.value.trim();
    if (!titulo) { input.focus(); return; }

    MockAPI.crearHabito(titulo, AppState.getUsuario().id);
    input.value = '';
    showToast('Hábito añadido.');
    renderHabitos();
  };

  const _handleCompletar = (habitoId) => {
    MockAPI.marcarCompletado(habitoId);
    showToast('Hábito completado.');
    patchCard(habitoId);
  };

  const _handleEliminar = async (habitoId, titulo) => {
    const confirmed = await showModal({
      title: '¿Eliminar hábito?',
      body:  `"${titulo}" y todo su historial se perderán.`,
    });
    if (!confirmed) return;

    const card = el(`card-${habitoId}`);
    if (card) card.classList.add('removing');

    setTimeout(() => {
      MockAPI.eliminarHabito(habitoId);
      showToast('Hábito eliminado.');
      renderHabitos();
    }, 280);
  };

  // Eventos

  const _bindEvents = () => {

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.form-panel').forEach(p => p.classList.add('hidden'));
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        el(`tab-${tab.dataset.tab}`).classList.remove('hidden');
      });
    });

    // Auth
    el('btn-login').addEventListener('click', _handleLogin);
    el('btn-register').addEventListener('click', _handleRegister);
    el('btn-logout').addEventListener('click', () => {
      AppState.clearUsuario();
      showAuth();
    });

    // Enter en campos de auth
    ['login-email', 'login-password'].forEach(id =>
      el(id).addEventListener('keydown', e => e.key === 'Enter' && _handleLogin())
    );
    ['register-name', 'register-email', 'register-password'].forEach(id =>
      el(id).addEventListener('keydown', e => e.key === 'Enter' && _handleRegister())
    );

    // Añadir hábito
    el('btn-add-habito').addEventListener('click', _handleCrearHabito);
    el('habito-titulo').addEventListener('keydown', e => e.key === 'Enter' && _handleCrearHabito());

    // Acciones en cards — event delegation
    el('lista-habitos').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const id     = Number(btn.dataset.id);
      const action = btn.dataset.action;

      if (action === 'completar') _handleCompletar(id);
      if (action === 'eliminar')  _handleEliminar(id, btn.dataset.titulo);
    });

    // Modal
    el('btn-modal-confirm').addEventListener('click', () => _closeModal(true));
    el('btn-modal-cancel').addEventListener('click',  () => _closeModal(false));
    el('modal-overlay').addEventListener('click', (e) => {
      if (e.target === el('modal-overlay')) _closeModal(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el('modal-overlay').hidden) _closeModal(false);
    });

    // Tema
    el('btn-theme').addEventListener('click', Theme.toggle);
  };

  const init = () => {
    Theme.init();
    _bindEvents();
  };

  return { init, renderHabitos, showToast };
})();


// Arranque

document.addEventListener('DOMContentLoaded', () => UI.init());