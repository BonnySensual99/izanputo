// Variables globales del juego
let canvas, ctx; // Canvas y contexto de dibujo
let socket; // Conexión Socket.io
let playerNumber = 0; // Número del jugador (1 o 2)
let gameState = {}; // Estado actual del juego
let keys = {}; // Estado de las teclas presionadas
let particles = []; // Partículas para efectos visuales
let lastTime = 0; // Último tiempo para animaciones

// Configuración de controles mejorados
const CONTROLS = {
    PADDLE_ACCELERATION: 0.8,
    PADDLE_MAX_SPEED: 12,
    PADDLE_FRICTION: 0.85
};

// Función de inicialización del juego
function initGame() {
    // Obtenemos el canvas y su contexto
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Configuramos el canvas para mejor calidad
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Conectamos con el servidor Socket.io
    socket = io();
    
    // Configuramos los eventos de Socket.io
    setupSocketEvents();
    
    // Configuramos los controles del teclado
    setupKeyboardControls();
    
    // Iniciamos el bucle de renderizado
    gameLoop();
}

// Configuración de los eventos de Socket.io
function setupSocketEvents() {
    // Cuando nos conectamos al servidor
    socket.on('connect', () => {
        console.log('Conectado al servidor');
    });
    
    // Cuando recibimos el estado del juego
    socket.on('gameState', (state) => {
        gameState = state;
        updateUI();
    });
    
    // Cuando el juego inicia
    socket.on('gameStart', () => {
        console.log('¡El juego ha comenzado!');
        document.getElementById('waitingMessage').classList.add('hidden');
        createStartEffect();
    });
    
    // Cuando una paleta se mueve
    socket.on('paddleMoved', (data) => {
        // Actualizamos la posición de la paleta correspondiente
        if (data.player === 1) {
            gameState.paddle1.speed = data.speed;
        } else if (data.player === 2) {
            gameState.paddle2.speed = data.speed;
        }
    });
}

// Configuración de los controles del teclado mejorados
function setupKeyboardControls() {
    // Evento cuando se presiona una tecla
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        e.preventDefault(); // Prevenir scroll en teclas de flecha
    });
    
    // Evento cuando se suelta una tecla
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
}

// Manejo del movimiento del jugador con física mejorada
function handlePlayerMovement() {
    let targetSpeed = 0;
    
    // Jugador 1: Teclas W y S
    if (playerNumber === 1) {
        if (keys['w']) {
            targetSpeed = -CONTROLS.PADDLE_MAX_SPEED;
        } else if (keys['s']) {
            targetSpeed = CONTROLS.PADDLE_MAX_SPEED;
        }
        
        // Aplicar aceleración suave
        const currentSpeed = gameState.paddle1.speed || 0;
        const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * CONTROLS.PADDLE_ACCELERATION;
        
        // Enviamos el movimiento al servidor
        socket.emit('movePaddle', { player: 1, speed: newSpeed });
    }
    // Jugador 2: Teclas de flecha
    else if (playerNumber === 2) {
        if (keys['arrowup']) {
            targetSpeed = -CONTROLS.PADDLE_MAX_SPEED;
        } else if (keys['arrowdown']) {
            targetSpeed = CONTROLS.PADDLE_MAX_SPEED;
        }
        
        const currentSpeed = gameState.paddle2.speed || 0;
        const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * CONTROLS.PADDLE_ACCELERATION;
        
        socket.emit('movePaddle', { player: 2, speed: newSpeed });
    }
}

// Crear efecto de partículas al inicio
function createStartEffect() {
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: 400,
            y: 300,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            decay: 0.02,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        });
    }
}

// Crear efecto de partículas al golpear
function createHitEffect(x, y, color = '#fff') {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            decay: 0.03,
            color: color
        });
    }
}

// Actualizar partículas
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Actualización de la interfaz de usuario
function updateUI() {
    // Actualizamos los marcadores
    document.getElementById('score1').textContent = gameState.score.player1;
    document.getElementById('score2').textContent = gameState.score.player2;
    
    // Actualizamos el mensaje de espera
    const waitingMessage = document.getElementById('waitingMessage');
    waitingMessage.textContent = `Esperando jugadores... (${gameState.players.length}/2)`;
    
    // Mostramos/ocultamos mensajes según el estado del juego
    if (gameState.gameStatus === 'waiting') {
        waitingMessage.classList.remove('hidden');
        document.getElementById('gameOverMessage').classList.add('hidden');
    } else if (gameState.gameStatus === 'finished') {
        waitingMessage.classList.add('hidden');
        showGameOverMessage();
    } else {
        waitingMessage.classList.add('hidden');
        document.getElementById('gameOverMessage').classList.add('hidden');
    }
    
    // Asignamos el número de jugador si no está asignado
    if (playerNumber === 0 && gameState.players.length > 0) {
        // El primer jugador que se conecta es el jugador 1
        if (socket.id === gameState.players[0]) {
            playerNumber = 1;
        } else if (gameState.players.length > 1 && socket.id === gameState.players[1]) {
            playerNumber = 2;
        }
    }
}

// Mostrar mensaje de fin de juego
function showGameOverMessage() {
    const gameOverMessage = document.getElementById('gameOverMessage');
    const winnerText = document.getElementById('winnerText');
    
    // Determinamos quién ganó
    if (gameState.score.player1 >= 5) {
        winnerText.textContent = '¡Jugador 1 ha ganado!';
    } else {
        winnerText.textContent = '¡Jugador 2 ha ganado!';
    }
    
    gameOverMessage.classList.remove('hidden');
}

// Función para reiniciar el juego
function resetGame() {
    // Enviamos la solicitud de reinicio al servidor
    socket.emit('resetGame');
}

// Bucle principal del juego (renderizado)
function gameLoop(currentTime = 0) {
    // Calcular delta time para animaciones suaves
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Limpiamos el canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Solo dibujamos si tenemos un estado del juego
    if (gameState.paddle1 && gameState.paddle2 && gameState.ball) {
        // Dibujamos las paletas
        drawPaddles();
        
        // Dibujamos la pelota
        drawBall();
        
        // Dibujamos la línea central animada
        drawCenterLine();
        
        // Dibujamos power-ups
        drawPowerUps();
        
        // Dibujamos partículas
        drawParticles();
        
        // Actualizamos partículas
        updateParticles();
        
        // Manejamos el movimiento del jugador
        if (gameState.gameStatus === 'playing') {
            handlePlayerMovement();
        }
    }
    
    // Continuamos el bucle
    requestAnimationFrame(gameLoop);
}

// Función para dibujar las paletas con efectos visuales
function drawPaddles() {
    // Paleta del jugador 1 (izquierda)
    drawPaddle(gameState.paddle1, '#fff', playerNumber === 1);
    
    // Paleta del jugador 2 (derecha)
    drawPaddle(gameState.paddle2, '#fff', playerNumber === 2);
}

// Función para dibujar una paleta individual con efectos
function drawPaddle(paddle, color, isCurrentPlayer) {
    const x = paddle.x - paddle.width / 2;
    const y = paddle.y - paddle.height / 2;
    
    // Efecto de brillo si es el jugador actual
    if (isCurrentPlayer) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
    }
    
    // Dibujar paleta principal
    ctx.fillStyle = color;
    ctx.fillRect(x, y, paddle.width, paddle.height);
    
    // Efecto de power-up
    if (paddle.powerup) {
        const powerupColor = getPowerupColor(paddle.powerup.type);
        ctx.fillStyle = powerupColor;
        ctx.fillRect(x - 2, y - 2, paddle.width + 4, paddle.height + 4);
        
        // Restaurar color principal
        ctx.fillStyle = color;
        ctx.fillRect(x, y, paddle.width, paddle.height);
    }
    
    // Resetear sombra
    ctx.shadowBlur = 0;
}

// Función para obtener color del power-up
function getPowerupColor(type) {
    switch (type) {
        case 'speed': return '#00ff00';
        case 'size': return '#ff00ff';
        case 'multiBall': return '#ffff00';
        default: return '#ffffff';
    }
}

// Función para dibujar la pelota con efectos
function drawBall() {
    const ball = gameState.ball;
    
    // Efecto de brillo
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 20;
    
    // Pelota principal
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Efecto de velocidad (trail)
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    const trailLength = Math.min(speed * 2, 20);
    
    if (trailLength > 5) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ball.x - ball.dx * 0.5, ball.y - ball.dy * 0.5, ball.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Resetear efectos
    ctx.shadowBlur = 0;
}

// Función para dibujar la línea central animada
function drawCenterLine() {
    ctx.strokeStyle = '#333';
    ctx.setLineDash([5, 15]);
    ctx.lineWidth = 2;
    
    // Línea principal
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Línea animada
    if (gameState.centerLine) {
        ctx.strokeStyle = '#666';
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, gameState.centerLine.offset);
        ctx.lineTo(canvas.width / 2, gameState.centerLine.offset + 100);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
}

// Función para dibujar power-ups
function drawPowerUps() {
    if (!gameState.powerups) return;
    
    gameState.powerups.forEach(powerup => {
        if (powerup.active) {
            const color = getPowerupColor(powerup.type);
            
            // Efecto de brillo
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            
            // Power-up principal
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Símbolo del power-up
            ctx.fillStyle = '#000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let symbol = '?';
            switch (powerup.type) {
                case 'speed': symbol = '⚡'; break;
                case 'size': symbol = '⬆️'; break;
                case 'multiBall': symbol = '🔴'; break;
            }
            
            ctx.fillText(symbol, powerup.x, powerup.y);
            
            // Resetear sombra
            ctx.shadowBlur = 0;
        }
    });
}

// Función para dibujar partículas
function drawParticles() {
    particles.forEach(particle => {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// Inicializamos el juego cuando la página esté lista
document.addEventListener('DOMContentLoaded', initGame);
