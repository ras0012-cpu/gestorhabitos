const API = "http://localhost:8081";
let usuarioActual = null;
let habitosActuales = [];

// ============ AUTENTICACIÓN ============

function register() {
    const nombre = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    
    if (!nombre || !email || !password) {
        alert("Por favor completa todos los campos");
        return;
    }
    
    fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password })
    })
    .then(res => res.json())
    .then(data => {
        alert("✅ Usuario registrado correctamente");
        document.getElementById("register-name").value = "";
        document.getElementById("register-email").value = "";
        document.getElementById("register-password").value = "";
    })
    .catch(err => {
        alert("❌ Error al registrar: " + err);
    });
}

function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    if (!email || !password) {
        alert("Por favor completa todos los campos");
        return;
    }
    
    fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.id) {
            usuarioActual = data;
            document.getElementById("auth-section").style.display = "none";
            document.getElementById("habitos-section").style.display = "block";
            cargarHabitos();
        } else {
            alert("❌ Email o contraseña incorrectos");
        }
    })
    .catch(err => {
        alert("❌ Error al iniciar sesión: " + err);
    });
}

function logout() {
    usuarioActual = null;
    habitosActuales = [];
    document.getElementById("auth-section").style.display = "grid";
    document.getElementById("habitos-section").style.display = "none";
    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";
}

// ============ HÁBITOS ============

function cargarHabitos() {
    fetch(`${API}/habitos`)
    .then(res => res.json())
    .then(habitos => {
        habitosActuales = habitos;
        mostrarHabitos(habitos);
        actualizarDashboard();
    })
    .catch(err => {
        console.error("Error al cargar hábitos:", err);
    });
}

async function mostrarHabitos(habitos) {
    const lista = document.getElementById("lista-habitos");
    lista.innerHTML = "";
    
    for (const habito of habitos) {
        // Obtener estadísticas del hábito
        const stats = await fetch(`${API}/estadisticas/habito/${habito.id}`)
            .then(res => res.json())
            .catch(() => ({
                rachaActual: 0,
                mejorRacha: 0,
                porcentaje7Dias: 0,
                porcentaje30Dias: 0,
                totalCompletados: 0
            }));
        
        const card = document.createElement("div");
        card.className = "habito-card";
        card.innerHTML = `
            <div class="habito-header">
                <h3>${habito.titulo}</h3>
            </div>
            
            <div class="habito-stats">
                <div class="mini-stat">
                    <div class="mini-stat-value">🔥 ${stats.rachaActual}</div>
                    <div class="mini-stat-label">Racha actual</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">🏆 ${stats.mejorRacha}</div>
                    <div class="mini-stat-label">Mejor racha</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">${Math.round(stats.porcentaje7Dias)}%</div>
                    <div class="mini-stat-label">Últimos 7 días</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">${Math.round(stats.porcentaje30Dias)}%</div>
                    <div class="mini-stat-label">Últimos 30 días</div>
                </div>
            </div>
            
            <div class="habito-actions">
                <button class="btn-completar" onclick="marcarCompletado(${habito.id})">✅ Completar hoy</button>
                <button class="btn-eliminar" onclick="eliminarHabito(${habito.id})">🗑️ Eliminar</button>
            </div>
        `;
        lista.appendChild(card);
    }
}

function actualizarDashboard() {
    const totalHabitos = habitosActuales.length;
    
    // Por ahora mostramos valores básicos
    // Más adelante calcularemos cuántos se completaron hoy
    document.getElementById("total-habitos").textContent = totalHabitos;
    document.getElementById("completados-hoy").textContent = 0;
    document.getElementById("porcentaje-dia").textContent = "0%";
    
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
}

function crearHabito() {
    const titulo = document.getElementById("habito-titulo").value;
    
    if (!titulo) {
        alert("Por favor escribe un hábito");
        return;
    }
    
    fetch(`${API}/habitos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            titulo: titulo,
            usuario: { id: usuarioActual.id }
        })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("habito-titulo").value = "";
        cargarHabitos();
    })
    .catch(err => {
        alert("❌ Error al crear hábito: " + err);
    });
}

function eliminarHabito(id) {
    if (!confirm("¿Seguro que quieres eliminar este hábito?")) {
        return;
    }
    
    fetch(`${API}/habitos/${id}`, {
        method: "DELETE"
    })
    .then(() => {
        cargarHabitos();
    })
    .catch(err => {
        alert("❌ Error al eliminar: " + err);
    });
}

function marcarCompletado(habitoId) {
    const hoy = new Date().toISOString().split('T')[0];
    
    fetch(`${API}/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fecha: hoy,
            completado: true,
            habito: { id: habitoId }
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("✅ ¡Hábito completado hoy!");
        cargarHabitos(); // Recargar para actualizar estadísticas
    })
    .catch(err => {
        alert("❌ Error: " + err);
    });
}