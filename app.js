'use strict';

const API = (() => {
  const BASE = 'http://localhost:3002/api';
  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => {
    const h = { 'Content-Type': 'application/json' };
    const t = getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  };

  const request = async (method, path, body) => {
    try {
      const res = await fetch(BASE + path, {
        method,
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la petición');
      return data;
    } catch (e) {
      console.error('API Error:', e);
      throw e;
    }
  };

  return {
    login: async (email, password) => {
      const data = await request('POST', '/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      return data;
    },
    register: async (nombre, email, password) => {
      const data = await request('POST', '/auth/register', { nombre, email, password });
      localStorage.setItem('token', data.token);
      return data;
    },
    logout: () => {
      localStorage.removeItem('token');
      location.reload();
    },
    getHabitos: (date) => request('GET', `/habitos?date=${date}`),
    crearHabito: (h) => request('POST', '/habitos', h),
    marcarCompletado: (id, date) => request('POST', `/habitos/${id}/completar`, { date }),
    eliminarHabito: (id) => request('DELETE', `/habitos/${id}`)
  };
})();

const Theme = {
  apply(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  },
  toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.apply(!isDark);
  },
  init() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(saved ? saved === 'dark' : prefersDark);
  }
};

const UI = (() => {
  const el = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const getToday = () => new Date().toISOString().split('T')[0];

  let _currentDate = getToday();
  let _allHabitos = [];

  const showToast = (msg, type = 'success') => {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
  };

  const switchView = (v) => {
    document.querySelectorAll('.app-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
    el('view-habitos').hidden = (v !== 'habitos');
    el('view-crear').hidden = (v !== 'crear');
    if (v === 'crear') {
      el('habito-titulo').value = '';
      el('habito-tipo').value = 'recurrente';
      el('field-fecha-puntual').classList.remove('revealed');
      el('habito-fecha-puntual').value = _currentDate;
    }
  };

  const showModal = (title, body, onConfirm) => {
    el('modal-title').textContent = title;
    el('modal-body').textContent = body;
    el('modal-overlay').hidden = false;
    
    const cancel = () => { el('modal-overlay').hidden = true; cleanup(); };
    const confirm = () => { onConfirm(); el('modal-overlay').hidden = true; cleanup(); };
    const cleanup = () => {
        el('btn-modal-cancel').onclick = null;
        el('btn-modal-confirm').onclick = null;
    };
    el('btn-modal-cancel').onclick = cancel;
    el('btn-modal-confirm').onclick = confirm;
  };

  const renderHabitos = async () => {
    try {
      _allHabitos = await API.getHabitos(_currentDate);
      const habitosDelDia = _allHabitos.filter(h => h.tipo === 'recurrente' || h.fecha_puntual === _currentDate);
      
      const done = habitosDelDia.filter(h => h.stats.completadoHoy).length;
      const total = habitosDelDia.length;
      const pct = total ? Math.round((done / total) * 100) : 0;

      el('completados-hoy').textContent = done;
      el('total-habitos').textContent = total;
      el('porcentaje-dia').textContent = `${pct}%`;
      el('progress-bar').style.width = `${pct}%`;

      el('lista-titulo').textContent = (_currentDate === getToday()) ? 'Hábitos de hoy' : `Hábitos del ${_currentDate}`;
      el('empty-state').hidden = (habitosDelDia.length > 0);

      const lista = el('lista-habitos');
      lista.innerHTML = '';
      habitosDelDia.forEach(h => {
        const card = document.createElement('div');
        card.className = `habito-card ${h.stats.completadoHoy ? 'completed-today' : ''}`;
        card.innerHTML = `
          <div class="habito-left">
            <div class="habito-title">${esc(h.titulo)} ${h.tipo === 'puntual' ? '<span class="badge-puntual">Puntual</span>' : ''}</div>
            <div class="habito-stats-row">
              <div class="mini-stat"><div class="mini-stat-value">${h.stats.rachaActual}</div><div class="mini-stat-label">Racha</div></div>
              <div class="mini-stat"><div class="mini-stat-value">${h.stats.porcentaje7Dias}%</div><div class="mini-stat-label">Éxito</div></div>
            </div>
          </div>
          <div class="habito-actions">
            <button class="btn-completar ${h.stats.completadoHoy ? 'done-today' : ''}" title="${h.stats.completadoHoy ? 'Desmarcar' : 'Marcar'}">
              ${h.stats.completadoHoy ? 'Hecho' : 'Marcar'}
            </button>
            <button class="btn-eliminar" aria-label="Eliminar">Borrar</button>
          </div>
        `;
        card.querySelector('.btn-completar').onclick = () => API.marcarCompletado(h.id, _currentDate).then(renderHabitos);
        card.querySelector('.btn-eliminar').onclick = () => { 
          showModal('¿Eliminar hábito?', `Esto borrará "${h.titulo}" y todo su historial de forma permanente.`, () => {
            API.eliminarHabito(h.id).then(renderHabitos);
          });
        };
        lista.appendChild(card);
      });
      renderCalendar();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const renderCalendar = () => {
    const now = new Date(_currentDate + 'T00:00:00');
    el('cal-month-label').textContent = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    const grid = el('calendar-grid');
    grid.innerHTML = '';
    const year = now.getFullYear(), month = now.getMonth();
    let offset = new Date(year, month, 1).getDay();
    offset = (offset === 0) ? 6 : offset - 1;

    for (let i = 0; i < offset; i++) {
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'cal-day cal-day--empty' }));
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = `cal-day ${ds === getToday() ? 'cal-day--today' : ''} ${ds === _currentDate ? 'cal-day--selected' : ''}`;
        cell.textContent = d;
        if (_allHabitos.some(h => h.tipo === 'puntual' && h.fecha_puntual === ds)) {
            cell.appendChild(Object.assign(document.createElement('span'), { className: 'cal-dot' }));
        }
        cell.onclick = () => { _currentDate = ds; renderHabitos(); };
        grid.appendChild(cell);
    }
  };

  const setupVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.querySelectorAll('.btn-voice').forEach(b => b.style.display = 'none');
      return;
    }

    const initVoiceField = (btnId, inputId) => {
      const btn = el(btnId);
      const input = el(inputId);
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let isRecording = false;

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (input.tagName === 'TEXTAREA') {
          const current = input.value.trim();
          input.value = current ? current + '. ' + text : text;
        } else {
          input.value = text;
        }
        input.focus();
        // Disparar evento de input para actualizaciones de UI
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      recognition.onend = () => {
        isRecording = false;
        btn.classList.remove('recording');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        isRecording = false;
        btn.classList.remove('recording');
        if (event.error !== 'no-speech') showToast('Error al reconocer voz: ' + event.error, 'error');
      };

      btn.onclick = (e) => {
        e.preventDefault();
        if (isRecording) {
          recognition.stop();
        } else {
          try {
            recognition.start();
            isRecording = true;
            btn.classList.add('recording');
          } catch (err) {
            console.error(err);
          }
        }
      };
    };

    initVoiceField('btn-voice-habito', 'habito-titulo');
    initVoiceField('btn-voice-diario', 'diario-texto');
  };

  const setupAuth = () => {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.form-panel').forEach(p => p.classList.add('hidden'));
            tab.classList.add('active');
            el(`tab-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });

    el('btn-login').addEventListener('click', async () => {
        try {
            const u = await API.login(el('login-email').value, el('login-password').value);
            el('user-name-display').textContent = u.nombre;
            el('auth-section').style.display = 'none';
            el('app-section').hidden = false;
            renderHabitos();
        } catch (e) { el('login-msg').textContent = e.message; }
    });

    el('btn-register').addEventListener('click', async () => {
        try {
            await API.register(el('register-name').value, el('register-email').value, el('register-password').value);
            el('register-msg').textContent = 'Listo. Ya puedes entrar.';
            setTimeout(() => document.querySelector('[data-tab="login"]').click(), 1500);
        } catch (e) { el('register-msg').textContent = e.message; }
    });
  };

  const init = () => {
    Theme.init();
    setupAuth();
    setupVoice();
    document.querySelectorAll('.app-tab').forEach(t => t.onclick = () => switchView(t.dataset.view));
    el('btn-logout').onclick = () => API.logout();
    el('btn-theme').onclick = () => Theme.toggle();
    el('habito-tipo').onchange = (e) => el('field-fecha-puntual').classList.toggle('revealed', e.target.value === 'puntual');
    el('btn-add-habito').onclick = async () => {
        try {
            await API.crearHabito({
                titulo: el('habito-titulo').value,
                tipo: el('habito-tipo').value,
                fecha_puntual: el('habito-fecha-puntual').value
            });
            el('habito-titulo').value = '';
            showToast('Hábito creado');
            switchView('habitos');
            renderHabitos();
        } catch (e) { showToast(e.message, 'error'); }
    };

    if (localStorage.getItem('token')) {
        renderHabitos().then(() => {
            el('auth-section').style.display = 'none';
            el('app-section').hidden = false;
        }).catch(() => API.logout());
    }
  };

  return { init };
})();

window.addEventListener('load', () => UI.init());