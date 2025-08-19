# 🏓 Pong Multijugador en Tiempo Real

Un juego clásico de Pong multijugador que funciona en tiempo real usando Node.js, Express y Socket.io.

## 🎮 Características

- **Multijugador en tiempo real**: Dos jugadores pueden jugar simultáneamente
- **Sincronización perfecta**: Los movimientos se ven en tiempo real en ambos clientes
- **Sistema de puntuación**: Primer jugador en llegar a 5 puntos gana
- **Diseño elegante**: Fondo negro con elementos blancos
- **Responsive**: Funciona en diferentes tamaños de pantalla

## 🚀 Instalación Local

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm (incluido con Node.js)

### Pasos de instalación

1. **Clona o descarga el proyecto**
   ```bash
   git clone <tu-repositorio>
   cd pong-multiplayer
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Inicia el servidor**
   ```bash
   npm start
   ```

4. **Abre tu navegador**
   - Ve a `http://localhost:3000`
   - Abre otra pestaña con la misma URL para el segundo jugador

## 🎯 Cómo jugar

### Controles
- **Jugador 1 (izquierda)**: 
  - `W` - Mover paleta hacia arriba
  - `S` - Mover paleta hacia abajo
- **Jugador 2 (derecha)**:
  - `↑` (flecha arriba) - Mover paleta hacia arriba
  - `↓` (flecha abajo) - Mover paleta hacia abajo

### Objetivo
- Evita que la pelota pase tu paleta
- Cada vez que la pelota pasa una paleta, el otro jugador suma 1 punto
- El primer jugador en llegar a 5 puntos gana

## 🌐 Despliegue en Render

### Paso 1: Subir a GitHub

1. **Crea un repositorio en GitHub**
   - Ve a [github.com](https://github.com)
   - Haz clic en "New repository"
   - Dale un nombre como "pong-multiplayer"
   - Haz clic en "Create repository"

2. **Sube tu código**
   ```bash
   git init
   git add .
   git commit -m "Primer commit: Juego Pong multijugador"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/pong-multiplayer.git
   git push -u origin main
   ```

### Paso 2: Crear servicio en Render

1. **Ve a Render**
   - Abre [render.com](https://render.com)
   - Crea una cuenta o inicia sesión

2. **Crea un nuevo Web Service**
   - Haz clic en "New +"
   - Selecciona "Web Service"
   - Conecta tu repositorio de GitHub

3. **Configura el servicio**
   - **Name**: `pong-multiplayer` (o el nombre que prefieras)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (o el plan que prefieras)

4. **Variables de entorno**
   - No necesitas configurar variables adicionales
   - Render automáticamente asigna un puerto

5. **Despliega**
   - Haz clic en "Create Web Service"
   - Espera a que se complete el despliegue

### Paso 3: Compartir y jugar

- Una vez desplegado, Render te dará una URL como:
  `https://tu-app.onrender.com`
- Comparte esta URL con tu amigo
- Ambos abren la URL en sus navegadores
- ¡A jugar!

## 📁 Estructura del Proyecto

```
pong-multiplayer/
├── public/
│   ├── index.html      # Página principal del juego
│   ├── style.css       # Estilos CSS
│   └── script.js       # Lógica del cliente
├── server.js           # Servidor Node.js + Socket.io
├── package.json        # Dependencias del proyecto
└── README.md          # Este archivo
```

## 🔧 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Tiempo Real**: Socket.io
- **Gráficos**: HTML5 Canvas API

## 🐛 Solución de Problemas

### El juego no inicia
- Verifica que tienes Node.js instalado: `node --version`
- Asegúrate de haber ejecutado `npm install`
- Revisa la consola del navegador para errores

### Los jugadores no se conectan
- Verifica que el servidor esté ejecutándose
- Asegúrate de que ambos jugadores estén en la misma URL
- Revisa la consola del servidor para errores de conexión

### Problemas de rendimiento
- El juego está optimizado para 60 FPS
- Si hay lag, verifica tu conexión a internet
- Cierra otras pestañas del navegador

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Puedes usarlo, modificarlo y distribuirlo libremente.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si encuentras un bug o tienes una mejora, no dudes en crear un issue o un pull request.

---

¡Disfruta jugando Pong con tus amigos! 🎮✨