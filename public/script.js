// Variables globales del juego
let canvas, ctx; // Canvas y contexto de dibujo
let socket; // Conexión Socket.io
let playerNumber = 0; // Número del jugador (1 o 2)
let gameState = {}; // Estado actual del juego
let keys = {}; // Estado de las teclas presionadas

// Función de inicialización del juego
function initGame() {
    // Obtenemos el canvas y su contexto
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
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
}

// Configuración de los controles del teclado
function setupKeyboardControls() {
    // Evento cuando se presiona una tecla
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        // Solo procesamos el movimiento si el juego está activo
        if (gameState.gameStatus === 'playing') {
            handlePlayerMovement();
        }
    });
    
    // Evento cuando se suelta una tecla
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
}

// Manejo del movimiento del jugador
function handlePlayerMovement() {
    let newY = 0;
    
    // Jugador 1: Teclas W y S
    if (playerNumber === 1) {
        if (keys['w'] && gameState.paddle1.y > 50) {
            newY = gameState.paddle1.y - 10;
        } else if (keys['s'] && gameState.paddle1.y < 550) {
            newY = gameState.paddle1.y + 10;
        }
        
        if (newY !== 0) {
            // Enviamos el movimiento al servidor
            socket.emit('movePaddle', { player: 1, y: newY });
        }
    }
    // Jugador 2: Teclas de flecha
    else if (playerNumber === 2) {
        if (keys['arrowup'] && gameState.paddle2.y > 50) {
            newY = gameState.paddle2.y - 10;
        } else if (keys['arrowdown'] && gameState.paddle2.y < 550) {
            newY = gameState.paddle2.y + 10;
        }
        
        if (newY !== 0) {
            // Enviamos el movimiento al servidor
            socket.emit('movePaddle', { player: 2, y: newY });
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
function gameLoop() {
    // Limpiamos el canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Solo dibujamos si tenemos un estado del juego
    if (gameState.paddle1 && gameState.paddle2 && gameState.ball) {
        // Dibujamos las paletas
        drawPaddles();
        
        // Dibujamos la pelota
        drawBall();
        
        // Dibujamos la línea central
        drawCenterLine();
    }
    
    // Continuamos el bucle
    requestAnimationFrame(gameLoop);
}

// Función para dibujar las paletas
function drawPaddles() {
    ctx.fillStyle = '#fff'; // Color blanco como se solicitó
    
    // Paleta del jugador 1 (izquierda)
    ctx.fillRect(
        gameState.paddle1.x - 10, 
        gameState.paddle1.y - 50, 
        20, 
        100
    );
    
    // Paleta del jugador 2 (derecha)
    ctx.fillRect(
        gameState.paddle2.x - 10, 
        gameState.paddle2.y - 50, 
        20, 
        100
    );
}

// Función para dibujar la pelota
function drawBall() {
    ctx.fillStyle = '#fff'; // Color blanco como se solicitó
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, 8, 0, Math.PI * 2);
    ctx.fill();
}

// Función para dibujar la línea central
function drawCenterLine() {
    ctx.strokeStyle = '#333';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Inicializamos el juego cuando la página esté lista
document.addEventListener('DOMContentLoaded', initGame);
