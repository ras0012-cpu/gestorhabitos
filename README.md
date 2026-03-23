# gestorhabitos
# Tracker de Hábitos — Demo
Un sistema premium de gestión de hábitos con calendario interactivo, soporte para tareas puntuales y modo oscuro dinámico.

##  Características Principales
- **Calendario Interactivo:** Navega por cualquier día del mes para consultar o completar tus hábitos. Los días con tareas pendientes muestran indicadores visuales (dots).
- **Hábitos Puntuales y Recurrentes:** Crea hábitos diarios o tareas para una fecha específica. Los hábitos puntuales solo aparecen en su día asignado.
- **Modo Oscuro/Claro:** Interfaz visualmente impactante que se adapta a tus preferencias o al sistema.
- **Estadísticas en Tiempo Real:** Seguimiento de rachas y porcentaje de éxito semanal/mensual directamente en el Dashboard.
- **Backend Persistente:** Motor de base de datos SQLite con persistencia en disco.

##  Tecnologías
- **Frontend:** HTML5, CSS3 (Vanilla) y JavaScript (ES6+).
- **Backend:** Node.js, Express, SQL.js (SQLite WASM).
- **Autenticación:** JWT (JSON Web Tokens).

##  Instalación
1. Clona el repositorio o descarga los archivos.
2. Abre una terminal en la carpeta `backend` e instala las dependencias:
   cd backend
   npm install

##  Cómo Ejecutar
Para que la aplicación funcione correctamente, debes iniciar tanto el servidor como la interfaz:

### 1. Iniciar el Backend
Desde la terminal en la carpeta `backend`:

# Windows (PowerShell)
$env:DB_PATH='.\habitos.db'
node src/server.js
*(El servidor escuchará en http://localhost:3002)*

### 2. Iniciar el Frontend
Desde la terminal en la carpeta raíz del proyecto:

npx serve -l 5500 .
*(La web se abrirá en http://localhost:5500)*

##  Usuario de Prueba (Demo)
- **Email:** `ana@test.com`
- **Contraseña:** `abc123`

*Construye quien quieres ser, un día a la vez.*
