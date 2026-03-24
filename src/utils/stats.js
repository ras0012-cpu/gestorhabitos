// ─────────────────────────────────────────────
// utils/stats.js
// Calcula las estadísticas de un hábito a partir
// de su array de fechas completadas.
//
// Se llama desde routes/habitos.js al listar o
// actualizar un hábito. No toca la BD — es pura
// lógica de negocio sobre un array de strings.
// ─────────────────────────────────────────────

/**
 * Genera un array con las fechas ISO de los últimos N días,
 * de más antiguo a más reciente. Hoy es el último elemento.
 * @param {string} today - fecha de referencia 'YYYY-MM-DD'
 * @param {number} n
 * @returns {string[]}
 */
const lastNDays = (today, n) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });

/**
 * Calcula todas las estadísticas de un hábito.
 *
 * @param {string[]} completedDates - array de fechas 'YYYY-MM-DD' en que se completó
 * @param {string}   today          - fecha de hoy 'YYYY-MM-DD'
 * @returns {Object} stats completas del hábito
 */
const calcStats = (completedDates, today) => {
  // Usamos un Set para lookups O(1) al comprobar si un día está completado
  const set = new Set(completedDates);

  const last7  = lastNDays(today, 7);
  const last30 = lastNDays(today, 30);

  // Porcentaje de días completados en los últimos 7 y 30 días
  const pct7  = Math.round((last7.filter(d  => set.has(d)).length / 7)  * 100);
  const pct30 = Math.round((last30.filter(d => set.has(d)).length / 30) * 100);

  // ── Racha actual ─────────────────────────────
  // Contamos días consecutivos hacia atrás desde hoy.
  // Si hoy no está completado, la racha es 0.
  let rachaActual = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (set.has(d.toISOString().split('T')[0])) rachaActual++;
    else break; // en cuanto hay un hueco, paramos
  }

  // ── Mejor racha histórica ─────────────────────
  // Ordenamos las fechas y buscamos la secuencia
  // de días consecutivos más larga.
  const sorted = [...completedDates].sort();
  let mejorRacha = 0, cur = 0, prev = null;
  for (const day of sorted) {
    if (prev) {
      const diff = (new Date(day) - new Date(prev)) / 86400000; // diferencia en días
      cur = diff === 1 ? cur + 1 : 1; // si es consecutivo, sumamos; si no, reiniciamos
    } else {
      cur = 1; // primer día
    }
    if (cur > mejorRacha) mejorRacha = cur;
    prev = day;
  }

  return {
    rachaActual,
    // La mejor racha nunca puede ser menor que la actual
    mejorRacha:       Math.max(mejorRacha, rachaActual),
    porcentaje7Dias:  pct7,
    porcentaje30Dias: pct30,
    // Flags de los últimos 7 días para los puntos visuales del frontend
    last7Flags: last7.map(d => ({
      date:    d,
      done:    set.has(d),      // ¿se completó ese día?
      isToday: d === today,     // ¿es hoy? (se pinta de otro color)
    })),
    completadoHoy: set.has(today),
  };
};

module.exports = { calcStats };