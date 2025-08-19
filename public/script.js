// Variables globales del juego
let canvas, ctx; // Canvas y contexto de dibujo
let socket; // Conexión Socket.io
let playerNumber = 0; // Número del jugador (1 o 2)
let gameState = {}; // Estado actual del juego
let keys = {}; // Estado de las teclas presionadas
let particles = []; // Partículas para efectos visuales
let lastTime = 0; // Último tiempo para animaciones
let countdownDisplay = null; // Elemento para mostrar la cuenta regresiva
let readyButton = null; // Botón de ready

// Configuración de controles optimizados para Super Pong
const CONTROLS = {
    PADDLE_MOVE_SPEED: 15,     // Velocidad de movimiento directo
    PADDLE_BOUNDS: { min: 50, max: 550 } // Límites de las paletas
};

// Función de inicialización del juego
function initGame() {
    // Obtenemos el canvas y su contexto
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Configuramos el canvas para mejor calidad
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Obtenemos elementos de la UI
    countdownDisplay = document.getElementById('countdownDisplay');
    readyButton = document.getElementById('readyButton');
    
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
        console.log('Conectado al servidor Super Pong');
    });
    
    // Cuando recibimos el estado del juego
    socket.on('gameState', (state) => {
        gameState = state;
        updateUI();
    });
    
    // Cuando la cuenta regresiva se actualiza
    socket.on('countdownUpdate', (data) => {
        showCountdown(data.countdown);
    });
    
    // Cuando la pelota comienza a moverse
    socket.on('ballStart', (data) => {
        console.log('¡La pelota ha comenzado a moverse!');
        createStartEffect();
    });
    
    // Cuando el juego inicia
    socket.on('gameStarted', () => {
        console.log('¡Super Pong ha comenzado!');
        hideCountdown();
        createStartEffect();
    });
    
    // Cuando una paleta se mueve
    socket.on('paddleMoved', (data) => {
        // Actualizamos la posición de la paleta correspondiente
        if (data.player === 1) {
            gameState.paddle1.y = data.y;
        } else if (data.player === 2) {
            gameState.paddle2.y = data.y;
        }
    });
    
    // Cuando un jugador está listo
    socket.on('playerReadyUpdate', (data) => {
        updateReadyStatus(data.player, data.ready);
    });
}

// Configuración de los controles del teclado optimizados
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

// Manejo del movimiento del jugador - MOVIMIENTO DIRECTO SIN DELAY
function handlePlayerMovement() {
    let newY = 0;
    
    // Jugador 1: Teclas W y S
    if (playerNumber === 1) {
        if (keys['w']) {
            newY = gameState.paddle1.y - CONTROLS.PADDLE_MOVE_SPEED;
        } else if (keys['s']) {
            newY = gameState.paddle1.y + CONTROLS.PADDLE_MOVE_SPEED;
        }
        
        // Limitar movimiento dentro de los límites
        if (newY !== 0) {
            newY = Math.max(CONTROLS.PADDLE_BOUNDS.min, Math.min(CONTROLS.PADDLE_BOUNDS.max, newY));
            
            // Enviamos el movimiento directo al servidor
            socket.emit('movePaddle', { player: 1, y: newY });
        }
    }
    // Jugador 2: Teclas de flecha
    else if (playerNumber === 2) {
        if (keys['arrowup']) {
            newY = gameState.paddle2.y - CONTROLS.PADDLE_MOVE_SPEED;
        } else if (keys['arrowdown']) {
            newY = gameState.paddle2.y + CONTROLS.PADDLE_MOVE_SPEED;
        }
        
        if (newY !== 0) {
            newY = Math.max(CONTROLS.PADDLE_BOUNDS.min, Math.min(CONTROLS.PADDLE_BOUNDS.max, newY));
            
            socket.emit('movePaddle', { player: 2, y: newY });
        }
    }
}

// Función para mostrar la cuenta regresiva
function showCountdown(count) {
    if (!countdownDisplay) return;
    
    countdownDisplay.textContent = count;
    countdownDisplay.classList.remove('hidden');
    countdownDisplay.classList.add('countdown-' + count);
    
    // Efecto de partículas para cada número
    createCountdownEffect(count);
}

// Función para ocultar la cuenta regresiva
function hideCountdown() {
    if (countdownDisplay) {
        countdownDisplay.classList.add('hidden');
    }
}

// Función para crear efecto de partículas en la cuenta regresiva
function createCountdownEffect(number) {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
    const color = colors[number - 1] || '#fff';
    
    for (let i = 0; i < 20; i++) { // Reducido para mejor rendimiento
        particles.push({
            x: 400,
            y: 300,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1,
            decay: 0.04,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

// Función para actualizar el estado de ready de un jugador
function updateReadyStatus(player, ready) {
    const readyElement = document.getElementById(`player${player}Ready`);
    if (readyElement) {
        if (ready) {
            readyElement.textContent = '✅ Listo';
            readyElement.classList.add('ready');
        } else {
            readyElement.textContent = '⏳ Esperando...';
            readyElement.classList.remove('ready');
        }
    }
}

// Función para marcar jugador como listo
function markPlayerReady() {
    if (playerNumber > 0) {
        socket.emit('playerReady', { player: playerNumber });
        
        // Actualizar botón localmente
        if (readyButton) {
            readyButton.textContent = '✅ Listo';
            readyButton.disabled = true;
            readyButton.classList.add('ready');
        }
    }
}

// Crear efecto de partículas al inicio
function createStartEffect() {
    for (let i = 0; i < 50; i++) { // Reducido para mejor rendimiento
        particles.push({
            x: 400,
            y: 300,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1,
            decay: 0.02,
            color: `hsl(${Math.random() * 360}, 80%, 70%)`,
            size: Math.random() * 3 + 2
        });
    }
}

// Crear efecto de partículas al golpear
function createHitEffect(x, y, color = '#fff') {
    for (let i = 0; i < 15; i++) { // Reducido para mejor rendimiento
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            decay: 0.05,
            color: color,
            size: Math.random() * 2 + 1
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
    
    // Limitar el número máximo de partículas para evitar memory leaks
    if (particles.length > 200) {
        particles.splice(0, particles.length - 200);
    }
}

// Actualización de la interfaz de usuario
function updateUI() {
    // Actualizamos los marcadores
    document.getElementById('score1').textContent = gameState.score.player1;
    document.getElementById('score2').textContent = gameState.score.player2;
    
    // Actualizamos el mensaje de espera
    const waitingMessage = document.getElementById('waitingMessage');
    
    if (gameState.gameStatus === 'waiting') {
        waitingMessage.textContent = `⏳ Esperando jugadores... (${gameState.players.length}/2)`;
        waitingMessage.classList.remove('hidden');
        document.getElementById('gameOverMessage').classList.add('hidden');
        
        // Mostrar botón de ready si es el jugador actual
        if (readyButton && playerNumber > 0) {
            readyButton.classList.remove('hidden');
            readyButton.disabled = false;
            readyButton.textContent = '🎮 Estoy Listo';
            readyButton.classList.remove('ready');
        }
    } else if (gameState.gameStatus === 'countdown') {
        waitingMessage.textContent = `🎯 Preparando partida...`;
        waitingMessage.classList.remove('hidden');
        document.getElementById('gameOverMessage').classList.add('hidden');
        
        // Ocultar botón de ready durante cuenta regresiva
        if (readyButton) {
            readyButton.classList.add('hidden');
        }
    } else if (gameState.gameStatus === 'finished') {
        waitingMessage.classList.add('hidden');
        showGameOverMessage();
        
        // Ocultar botón de ready
        if (readyButton) {
            readyButton.classList.add('hidden');
        }
    } else {
        waitingMessage.classList.add('hidden');
        document.getElementById('gameOverMessage').classList.add('hidden');
        
        // Ocultar botón de ready durante el juego
        if (readyButton) {
            readyButton.classList.add('hidden');
        }
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
        winnerText.textContent = '🎉 ¡Jugador 1 ha ganado!';
    } else {
        winnerText.textContent = '🎉 ¡Jugador 2 ha ganado!';
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
        
        // Dibujamos la pelota (estática durante cuenta regresiva)
        drawBall();
        
        // Dibujamos power-ups
        drawPowerUps();
        
        // Dibujamos la línea central animada
        drawCenterLine();
        
        // Dibujamos partículas
        drawParticles();
        
        // Actualizamos partículas
        updateParticles();
        
        // Manejamos el movimiento del jugador solo durante el juego
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
    if (paddle.invisible) return; // No dibujar si es invisible
    
    const x = paddle.x - paddle.width / 2;
    const y = paddle.y - paddle.height / 2;
    
    // Efecto de brillo si es el jugador actual
    if (isCurrentPlayer) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
    }
    
    // Dibujar paleta principal
    ctx.fillStyle = color;
    ctx.fillRect(x, y, paddle.width, paddle.height);
    
    // Efecto de power-up
    if (paddle.powerup) {
        const powerupColor = getPowerupColor(paddle.powerup.type);
        ctx.fillStyle = powerupColor;
        ctx.fillRect(x - 3, y - 3, paddle.width + 6, paddle.height + 6);
        
        // Restaurar color principal
        ctx.fillStyle = color;
        ctx.fillRect(x, y, paddle.width, paddle.height);
        
        // Efecto de escudo
        if (paddle.powerup.type === 'shield') {
            ctx.strokeStyle = powerupColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 5, y - 5, paddle.width + 10, paddle.height + 10);
        }
    }
    
    // Resetear sombra
    ctx.shadowBlur = 0;
}

// Función para obtener color del power-up
function getPowerupColor(type) {
    switch (type) {
        case 'speed': return '#00ff00';
        case 'size': return '#ff00ff';
        case 'shield': return '#ff8800';
        default: return '#ffffff';
    }
}

// Función para dibujar la pelota con efectos
function drawBall() {
    const ball = gameState.ball;
    
    // Efecto de brillo
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 25;
    
    // Pelota principal
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Si la pelota no se está moviendo, añadir efecto de "pulso"
    if (!ball.moving) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Texto "LISTO" sobre la pelota
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LISTO', ball.x, ball.y - 30);
    }
    
    // Trail de la pelota solo si se está moviendo
    if (ball.moving && ball.trail && ball.trail.length > 0) {
        ball.trail.forEach((pos, index) => {
            const alpha = (ball.trail.length - index) / ball.trail.length;
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ball.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });
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
            ctx.shadowBlur = 15;
            
            // Power-up principal
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, 18, 0, Math.PI * 2);
            ctx.fill();
            
            // Símbolo del power-up
            ctx.fillStyle = '#000';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let symbol = '?';
            switch (powerup.type) {
                case 'speed': symbol = '⚡'; break;
                case 'size': symbol = '⬆️'; break;
                case 'shield': symbol = '🛡️'; break;
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
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// Inicializamos el juego cuando la página esté lista
document.addEventListener('DOMContentLoaded', initGame);
