// Importamos las dependencias necesarias
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Creamos la aplicación Express
const app = express();
const server = http.createServer(app);

// Configuramos Socket.io para manejar las conexiones en tiempo real
const io = socketIo(server);

// Configuramos Express para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Constantes del juego para Super Pong
const GAME_CONFIG = {
    PADDLE_SPEED: 15,          // Velocidad instantánea de las paletas
    BALL_INITIAL_SPEED: 6,     // Velocidad inicial de la pelota
    BALL_MAX_SPEED: 18,        // Velocidad máxima de la pelota
    BALL_ACCELERATION: 0.3,    // Aceleración por segundo
    PADDLE_BOUNCE_FACTOR: 1.3, // Factor de rebote en paletas
    WALL_BOUNCE_FACTOR: 0.9,   // Factor de rebote en paredes
    POWERUP_CHANCE: 0.1,       // Probabilidad de spawn de power-up (reducida)
    POWERUP_DURATION: 8000,    // Duración del power-up en ms
    OBSTACLE_CHANCE: 0.05,     // Probabilidad de spawn de obstáculo (reducida)
    MAX_POWERUPS: 2,           // Máximo de power-ups simultáneos
    MAX_OBSTACLES: 1,          // Máximo de obstáculos simultáneos
    COUNTDOWN_DURATION: 3000,  // Duración de la cuenta regresiva en ms
    BALL_START_DELAY: 1000     // Delay antes de que la pelota se mueva
};

// Variables del juego que se mantienen en el servidor
let gameState = {
    // Posiciones de las paletas (x, y) - MOVIMIENTO DIRECTO SIN DELAY
    paddle1: { x: 50, y: 300, width: 20, height: 100, powerup: null, invisible: false, ready: false },
    paddle2: { x: 750, y: 300, width: 20, height: 100, powerup: null, invisible: false, ready: false },
    // Posición y velocidad de la pelota
    ball: { 
        x: 400, y: 300, 
        dx: 0, 
        dy: 0,
        radius: 8,
        speed: GAME_CONFIG.BALL_INITIAL_SPEED,
        trail: [], // Trail de la pelota para efectos visuales
        moving: false // Si la pelota se está moviendo
    },
    // Puntuación de cada jugador
    score: { player1: 0, player2: 0 },
    // Estado del juego (waiting, countdown, playing, finished, pausado)
    gameStatus: 'waiting',
    // Jugadores conectados
    players: [],
    // Power-ups activos
    powerups: [],
    // Obstáculos en el campo
    obstacles: [],
    // Tiempo del juego para aceleración progresiva
    gameTime: 0,
    // Último tiempo de actualización
    lastUpdate: Date.now(),
    // Línea central animada
    centerLine: { offset: 0 },
    // Modo de juego actual
    gameMode: 'classic', // classic, turbo, chaos
    // Pelotas múltiples (para modo caos)
    multiBalls: [],
    // Efectos especiales activos
    effects: [],
    // Sistema de cuenta regresiva
    countdown: 3,
    // Tiempo de inicio de la partida
    gameStartTime: null
};

// Función para generar dirección aleatoria de la pelota
function getRandomBallDirection() {
    // Generar ángulo aleatorio entre -45 y 45 grados
    const angle = (Math.random() * 90 - 45) * (Math.PI / 180);
    
    // Decidir aleatoriamente si va hacia la izquierda o derecha
    const direction = Math.random() < 0.5 ? -1 : 1;
    
    return {
        dx: Math.cos(angle) * GAME_CONFIG.BALL_INITIAL_SPEED * direction,
        dy: Math.sin(angle) * GAME_CONFIG.BALL_INITIAL_SPEED
    };
}

// Función para generar posición inicial aleatoria de la pelota
function getRandomBallPosition() {
    // Posición X centrada con pequeña variación
    const x = 400 + (Math.random() - 0.5) * 100;
    // Posición Y con más variación para mayor aleatoriedad
    const y = 150 + Math.random() * 300;
    
    return { x, y };
}

// Función para reiniciar el estado del juego
function resetGame() {
    // Posición aleatoria de la pelota
    const randomPos = getRandomBallPosition();
    
    gameState.ball = { 
        x: randomPos.x,
        y: randomPos.y,
        dx: 0, // La pelota no se mueve hasta que empiece la cuenta regresiva
        dy: 0,
        radius: 8,
        speed: GAME_CONFIG.BALL_INITIAL_SPEED,
        trail: [],
        moving: false
    };
    
    // Resetear paletas
    gameState.paddle1 = { x: 50, y: 300, width: 20, height: 100, powerup: null, invisible: false, ready: false };
    gameState.paddle2 = { x: 750, y: 300, width: 20, height: 100, powerup: null, invisible: false, ready: false };
    
    // Resetear otros elementos
    gameState.gameStatus = 'countdown';
    gameState.powerups = [];
    gameState.obstacles = [];
    gameState.multiBalls = [];
    gameState.effects = [];
    gameState.gameTime = 0;
    gameState.lastUpdate = Date.now();
    gameState.countdown = 3;
    gameState.gameStartTime = null;
    
    // Iniciar cuenta regresiva
    startCountdown();
}

// Función para iniciar la cuenta regresiva
function startCountdown() {
    gameState.countdown = 3;
    gameState.gameStatus = 'countdown';
    
    // Enviar estado inicial
    io.emit('gameState', gameState);
    
    const countdownInterval = setInterval(() => {
        gameState.countdown--;
        
        if (gameState.countdown > 0) {
            // Enviar actualización de cuenta regresiva
            io.emit('countdownUpdate', { countdown: gameState.countdown });
        } else {
            // Iniciar el juego
            clearInterval(countdownInterval);
            startGame();
        }
    }, 1000);
}

// Función para iniciar el juego
function startGame() {
    gameState.gameStatus = 'playing';
    gameState.gameStartTime = Date.now();
    
    // Generar dirección aleatoria para la pelota
    const randomDir = getRandomBallDirection();
    gameState.ball.dx = randomDir.dx;
    gameState.ball.dy = randomDir.dy;
    
    // Delay antes de que la pelota se mueva
    setTimeout(() => {
        gameState.ball.moving = true;
        io.emit('ballStart', { dx: gameState.ball.dx, dy: gameState.ball.dy });
    }, GAME_CONFIG.BALL_START_DELAY);
    
    // Enviar estado de juego iniciado
    io.emit('gameState', gameState);
    io.emit('gameStarted');
}

// Función para crear un power-up avanzado
function createPowerUp() {
    if (Math.random() < GAME_CONFIG.POWERUP_CHANCE && gameState.powerups.length < GAME_CONFIG.MAX_POWERUPS) {
        const types = ['speed', 'size', 'shield']; // Solo power-ups estables
        const type = types[Math.floor(Math.random() * types.length)];
        
        const powerup = {
            x: 200 + Math.random() * 400, // Evitar bordes
            y: 100 + Math.random() * 400,
            type: type,
            active: true,
            createdAt: Date.now(),
            id: Date.now() + Math.random()
        };
        
        gameState.powerups.push(powerup);
    }
}

// Función para crear obstáculos
function createObstacle() {
    if (Math.random() < GAME_CONFIG.OBSTACLE_CHANCE && gameState.obstacles.length < GAME_CONFIG.MAX_OBSTACLES) {
        const types = ['block']; // Solo obstáculos estables
        const type = types[Math.floor(Math.random() * types.length)];
        
        const obstacle = {
            x: 200 + Math.random() * 400,
            y: 100 + Math.random() * 400,
            type: type,
            active: true,
            createdAt: Date.now(),
            id: Date.now() + Math.random(),
            width: 40,
            height: 40
        };
        
        gameState.obstacles.push(obstacle);
    }
}

// Función para aplicar power-up avanzado a un jugador
function applyPowerUp(player, powerupType) {
    const duration = GAME_CONFIG.POWERUP_DURATION;
    
    switch (powerupType) {
        case 'speed':
            player.powerup = { type: 'speed', duration: duration, startTime: Date.now() };
            break;
        case 'size':
            player.powerup = { type: 'size', duration: duration, startTime: Date.now() };
            player.height = 150; // Paleta más grande
            break;
        case 'shield':
            player.powerup = { type: 'shield', duration: duration, startTime: Date.now() };
            break;
    }
}

// Función para limpiar power-ups y obstáculos expirados
function cleanExpiredItems() {
    const now = Date.now();
    
    // Limpiar power-ups del suelo
    gameState.powerups = gameState.powerups.filter(powerup => 
        now - powerup.createdAt < 20000 // Power-ups duran 20 segundos
    );
    
    // Limpiar obstáculos
    gameState.obstacles = gameState.obstacles.filter(obstacle => 
        now - obstacle.createdAt < 30000 // Obstáculos duran 30 segundos
    );
    
    // Limpiar power-ups de jugadores
    [gameState.paddle1, gameState.paddle2].forEach(paddle => {
        if (paddle.powerup && now - paddle.powerup.startTime > paddle.powerup.duration) {
            if (paddle.powerup.type === 'size') {
                paddle.height = 100; // Restaurar tamaño normal
            }
            paddle.powerup = null;
        }
    });
}

// Función para actualizar la posición de la pelota con física optimizada
function updateBall() {
    if (gameState.gameStatus !== 'playing' || !gameState.ball.moving) return;
    
    const now = Date.now();
    const deltaTime = (now - gameState.lastUpdate) / 1000;
    gameState.lastUpdate = now;
    
    // Aceleración progresiva de la pelota
    gameState.gameTime += deltaTime;
    const targetSpeed = Math.min(
        GAME_CONFIG.BALL_INITIAL_SPEED + (gameState.gameTime * GAME_CONFIG.BALL_ACCELERATION),
        GAME_CONFIG.BALL_MAX_SPEED
    );
    
    // Normalizar la velocidad actual
    const currentSpeed = Math.sqrt(gameState.ball.dx * gameState.ball.dx + gameState.ball.dy * gameState.ball.dy);
    if (currentSpeed > 0) {
        gameState.ball.dx = (gameState.ball.dx / currentSpeed) * targetSpeed;
        gameState.ball.dy = (gameState.ball.dy / currentSpeed) * targetSpeed;
    }
    
    // Actualizar trail de la pelota
    gameState.ball.trail.unshift({ x: gameState.ball.x, y: gameState.ball.y });
    if (gameState.ball.trail.length > 5) {
        gameState.ball.trail.pop();
    }
    
    // Movemos la pelota según su velocidad
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;
    
    // Rebotamos la pelota en las paredes superior e inferior
    if (gameState.ball.y <= gameState.ball.radius) {
        gameState.ball.y = gameState.ball.radius;
        gameState.ball.dy = -gameState.ball.dy * GAME_CONFIG.WALL_BOUNCE_FACTOR;
    } else if (gameState.ball.y >= 600 - gameState.ball.radius) {
        gameState.ball.y = 600 - gameState.ball.radius;
        gameState.ball.dy = -gameState.ball.dy * GAME_CONFIG.WALL_BOUNCE_FACTOR;
    }
    
    // Verificamos si la pelota golpea la paleta del jugador 1
    if (gameState.ball.x <= gameState.paddle1.x + gameState.paddle1.width + gameState.ball.radius &&
        gameState.ball.x >= gameState.paddle1.x - gameState.ball.radius &&
        gameState.ball.y >= gameState.paddle1.y - gameState.paddle1.height/2 &&
        gameState.ball.y <= gameState.paddle1.y + gameState.paddle1.height/2 &&
        !gameState.paddle1.invisible) {
        
        // Calcular punto de impacto para rebote realista
        const hitPoint = (gameState.ball.y - gameState.paddle1.y) / (gameState.paddle1.height / 2);
        const angle = hitPoint * Math.PI / 3; // Ángulo máximo de 60 grados
        
        gameState.ball.x = gameState.paddle1.x + gameState.paddle1.width + gameState.ball.radius;
        gameState.ball.dx = Math.abs(gameState.ball.dx) * GAME_CONFIG.PADDLE_BOUNCE_FACTOR;
        gameState.ball.dy = Math.sin(angle) * gameState.ball.dx;
        
        // Crear power-up y obstáculo ocasionalmente
        createPowerUp();
        createObstacle();
    }
    
    // Verificamos si la pelota golpea la paleta del jugador 2
    if (gameState.ball.x >= gameState.paddle2.x - gameState.paddle2.width - gameState.ball.radius &&
        gameState.ball.x <= gameState.paddle2.x + gameState.ball.radius &&
        gameState.ball.y >= gameState.paddle2.y - gameState.paddle2.height/2 &&
        gameState.ball.y <= gameState.paddle2.y + gameState.paddle2.height/2 &&
        !gameState.paddle2.invisible) {
        
        const hitPoint = (gameState.ball.y - gameState.paddle2.y) / (gameState.paddle2.height / 2);
        const angle = hitPoint * Math.PI / 3;
        
        gameState.ball.x = gameState.paddle2.x - gameState.paddle2.width - gameState.ball.radius;
        gameState.ball.dx = -Math.abs(gameState.ball.dx) * GAME_CONFIG.PADDLE_BOUNCE_FACTOR;
        gameState.ball.dy = Math.sin(angle) * Math.abs(gameState.ball.dx);
        
        createPowerUp();
        createObstacle();
    }
    
    // Verificar colisiones con obstáculos
    gameState.obstacles.forEach((obstacle, index) => {
        if (obstacle.active) {
            if (gameState.ball.x >= obstacle.x && 
                gameState.ball.x <= obstacle.x + obstacle.width &&
                gameState.ball.y >= obstacle.y && 
                gameState.ball.y <= obstacle.y + obstacle.height) {
                
                switch (obstacle.type) {
                    case 'block':
                        // Bloque destructible
                        obstacle.active = false;
                        gameState.obstacles.splice(index, 1);
                        break;
                }
            }
        }
    });
    
    // Verificar colisiones con power-ups
    gameState.powerups.forEach((powerup, index) => {
        if (powerup.active) {
            const distance = Math.sqrt(
                Math.pow(gameState.ball.x - powerup.x, 2) + 
                Math.pow(gameState.ball.y - powerup.y, 2)
            );
            
            if (distance < gameState.ball.radius + 15) {
                // Determinar qué jugador recibe el power-up
                if (gameState.ball.x < 400) {
                    applyPowerUp(gameState.paddle1, powerup.type);
                } else {
                    applyPowerUp(gameState.paddle2, powerup.type);
                }
                
                powerup.active = false;
                gameState.powerups.splice(index, 1);
            }
        }
    });
    
    // Verificamos si la pelota sale por la izquierda (punto para jugador 2)
    if (gameState.ball.x <= 0) {
        gameState.score.player2++;
        if (gameState.score.player2 >= 5) {
            gameState.gameStatus = 'finished';
        } else {
            resetGame();
        }
    }
    
    // Verificamos si la pelota sale por la derecha (punto para jugador 1)
    if (gameState.ball.x >= 800) {
        gameState.score.player1++;
        if (gameState.score.player1 >= 5) {
            gameState.gameStatus = 'finished';
        } else {
            resetGame();
        }
    }
    
    // Limpiar elementos expirados
    cleanExpiredItems();
    
    // Animar línea central
    gameState.centerLine.offset = (gameState.centerLine.offset + 3) % 20;
}

// Configuramos los eventos de Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);
    
    // Añadimos el jugador a la lista
    if (gameState.players.length < 2) {
        gameState.players.push(socket.id);
        
        // Si tenemos 2 jugadores, iniciamos la cuenta regresiva
        if (gameState.players.length === 2) {
            resetGame(); // Esto iniciará la cuenta regresiva
        }
    }
    
    // Enviamos el estado actual del juego al nuevo jugador
    socket.emit('gameState', gameState);
    
    // Manejamos el movimiento de las paletas - MOVIMIENTO DIRECTO SIN DELAY
    socket.on('movePaddle', (data) => {
        // MOVIMIENTO INSTANTÁNEO - Sin interpolación ni delay
        if (data.player === 1) {
            // Limitar movimiento dentro de los límites del canvas
            const newY = Math.max(50, Math.min(550, data.y));
            gameState.paddle1.y = newY;
        } else if (data.player === 2) {
            const newY = Math.max(50, Math.min(550, data.y));
            gameState.paddle2.y = newY;
        }
        
        // Enviamos la actualización a todos los clientes
        io.emit('paddleMoved', data);
    });
    
    // Manejamos cuando un jugador está listo
    socket.on('playerReady', (data) => {
        if (data.player === 1) {
            gameState.paddle1.ready = true;
        } else if (data.player === 2) {
            gameState.paddle2.ready = true;
        }
        
        // Verificar si ambos jugadores están listos
        if (gameState.paddle1.ready && gameState.paddle2.ready && gameState.gameStatus === 'waiting') {
            resetGame();
        }
        
        io.emit('playerReadyUpdate', { player: data.player, ready: true });
    });
    
    // Manejamos la solicitud de reinicio del juego
    socket.on('resetGame', () => {
        gameState.score.player1 = 0;
        gameState.score.player2 = 0;
        resetGame();
        io.emit('gameState', gameState);
    });
    
    // Manejamos la desconexión de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        
        // Removemos el jugador de la lista
        const index = gameState.players.indexOf(socket.id);
        if (index > -1) {
            gameState.players.splice(index, 1);
        }
        
        // Si no hay suficientes jugadores, pausamos el juego
        if (gameState.players.length < 2) {
            gameState.gameStatus = 'waiting';
            gameState.paddle1.ready = false;
            gameState.paddle2.ready = false;
            io.emit('gameState', gameState);
        }
    });
});

// Bucle del juego optimizado para 60 FPS
setInterval(() => {
    updateBall();
    // Enviamos el estado actualizado a todos los clientes
    io.emit('gameState', gameState);
}, 16); // 60 FPS

// Configuramos el puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciamos el servidor
server.listen(PORT, () => {
    console.log(`🚀 Super Pong ejecutándose en el puerto ${PORT}`);
    console.log(`🎮 Abre http://localhost:${PORT} en tu navegador`);
    console.log(`⚡ Características: Power-ups, obstáculos, física optimizada`);
    console.log(`🎯 Nuevo sistema: Cuenta regresiva y pelota aleatoria`);
    console.log(`🔧 Bugs críticos arreglados`);
});
