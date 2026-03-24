// ─────────────────────────────────────────────
// utils/frases.js
// Batería de frases motivacionales que se muestran
// de forma aleatoria en cada inicio de sesión.
//
// Para añadir más frases: simplemente agrega un string
// al array. No hace falta tocar ningún otro archivo.
// ─────────────────────────────────────────────

const FRASES = [
  // Constancia
  "La constancia no es un acto, es un hábito.",
  "No tienes que ser el mejor. Solo tienes que ser mejor que ayer.",
  "Un 1% mejor cada día. Al año eres 37 veces mejor.",
  "Los hábitos son el interés compuesto de la superación personal.",
  "No se trata de motivación. Se trata de disciplina.",
  "El dolor del esfuerzo dura poco. El orgullo de haberlo hecho, siempre.",

  // Proceso
  "Confía en el proceso, incluso cuando no ves los resultados.",
  "Pequeñas acciones consistentes crean grandes transformaciones.",
  "No rompas la cadena. Un día más.",
  "El progreso lento sigue siendo progreso.",
  "Empieza donde estás. Usa lo que tienes. Haz lo que puedas.",
  "El mejor momento para empezar fue ayer. El segundo mejor es ahora.",

  // Resiliencia
  "Caer no es fracasar. Quedarse en el suelo, sí.",
  "Un día malo no arruina un buen hábito. Sigue.",
  "La perfección es enemiga del progreso.",
  "No necesitas ser perfecto todos los días. Solo necesitas volver.",
  "Las malas rachas terminan. Las buenas también empiezan.",

  // Identidad
  "Cada vez que cumples un hábito, te demuestras quién eres.",
  "Eres la suma de lo que haces repetidamente.",
  "Tu yo del futuro te está mirando. No le decepciones.",
  "No estás construyendo hábitos. Estás construyendo tu identidad.",
  "Quien quieres ser ya existe. Tus hábitos son el camino hacia él.",

  // Foco
  "Haz una cosa. Hazla bien. Hazla hoy.",
  "La energía sigue a la atención. Ponla donde importa.",
  "El foco no es hacer más. Es hacer lo correcto.",
];

/**
 * Devuelve una frase aleatoria de la batería.
 * Se llama en cada login para que el usuario
 * vea una frase diferente cada vez que entra.
 *
 * @returns {string} Una frase motivacional aleatoria
 */
const getFraseAleatoria = () =>
  FRASES[Math.floor(Math.random() * FRASES.length)];

module.exports = { getFraseAleatoria, FRASES };