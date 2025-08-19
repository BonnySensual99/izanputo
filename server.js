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

// Constantes del juego para mejor balance
const GAME_CONFIG = {
    PADDLE_SPEED: 8,           // Velocidad de las paletas
    BALL_INITIAL_SPEED: 4,     // Velocidad inicial de la pelota
    BALL_MAX_SPEED: 12,        // Velocidad máxima de la pelota
    BALL_ACCELERATION: 0.2,    // Aceleración por segundo
    PADDLE_BOUNCE_FACTOR: 1.2, // Factor de rebote en paletas
    WALL_BOUNCE_FACTOR: 0.8,   // Factor de rebote en paredes
    POWERUP_CHANCE: 0.1,       // Probabilidad de spawn de power-up
    POWERUP_DURATION: 10000    // Duración del power-up en ms
};

// Variables del juego que se mantienen en el servidor
let gameState = {
    // Posiciones de las paletas (x, y)
    paddle1: { x: 50, y: 300, width: 20, height: 100, speed: 0, powerup: null },
    paddle2: { x: 750, y: 300, width: 20, height: 100, speed: 0, powerup: null },
    // Posición y velocidad de la pelota
    ball: { 
        x: 400, y: 300, 
        dx: GAME_CONFIG.BALL_INITIAL_SPEED, 
        dy: GAME_CONFIG.BALL_INITIAL_SPEED * 0.5,
        radius: 8,
        speed: GAME_CONFIG.BALL_INITIAL_SPEED
    },
    // Puntuación de cada jugador
    score: { player1: 0, player2: 0 },
    // Estado del juego (esperando, jugando, terminado, pausado)
    gameStatus: 'waiting',
    // Jugadores conectados
    players: [],
    // Power-ups activos
    powerups: [],
    // Tiempo del juego para aceleración progresiva
    gameTime: 0,
    // Último tiempo de actualización
    lastUpdate: Date.now(),
    // Línea central animada
    centerLine: { offset: 0 }
};

// Función para reiniciar el estado del juego
function resetGame() {
    gameState.ball = { 
        x: 400, y: 300, 
        dx: GAME_CONFIG.BALL_INITIAL_SPEED, 
        dy: GAME_CONFIG.BALL_INITIAL_SPEED * 0.5,
        radius: 8,
        speed: GAME_CONFIG.BALL_INITIAL_SPEED
    };
    gameState.paddle1 = { x: 50, y: 300, width: 20, height: 100, speed: 0, powerup: null };
    gameState.paddle2 = { x: 750, y: 300, width: 20, height: 100, speed: 0, powerup: null };
    gameState.gameStatus = 'playing';
    gameState.powerups = [];
    gameState.gameTime = 0;
    gameState.lastUpdate = Date.now();
}

// Función para crear un power-up aleatorio
function createPowerUp() {
    if (Math.random() < GAME_CONFIG.POWERUP_CHANCE && gameState.powerups.length < 2) {
        const types = ['speed', 'size', 'multiBall'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const powerup = {
            x: 400 + (Math.random() - 0.5) * 400,
            y: 100 + Math.random() * 400,
            type: type,
            active: true,
            createdAt: Date.now()
        };
        
        gameState.powerups.push(powerup);
    }
}

// Función para aplicar power-up a un jugador
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
        case 'multiBall':
            player.powerup = { type: 'multiBall', duration: duration, startTime: Date.now() };
            break;
    }
}

// Función para limpiar power-ups expirados
function cleanExpiredPowerUps() {
    const now = Date.now();
    
    // Limpiar power-ups del suelo
    gameState.powerups = gameState.powerups.filter(powerup => 
        now - powerup.createdAt < 15000 // Power-ups duran 15 segundos en el suelo
    );
    
    // Limpiar power-ups de jugadores
    [gameState.paddle1, gameState.paddle2].forEach(paddle => {
        if (paddle.powerup && now - paddle.powerup.startTime > paddle.powerup.duration) {
            paddle.powerup = null;
            if (paddle.powerup?.type === 'size') {
                paddle.height = 100; // Restaurar tamaño normal
            }
        }
    });
}

// Función para actualizar la posición de la pelota con física mejorada
function updateBall() {
    if (gameState.gameStatus !== 'playing') return;
    
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
    
    // Movemos la pelota según su velocidad
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;
    
    // Rebotamos la pelota en las paredes superior e inferior con física mejorada
    if (gameState.ball.y <= gameState.ball.radius) {
        gameState.ball.y = gameState.ball.radius;
        gameState.ball.dy = -gameState.ball.dy * GAME_CONFIG.WALL_BOUNCE_FACTOR;
        // Añadir un poco de aleatoriedad para evitar loops infinitos
        gameState.ball.dy += (Math.random() - 0.5) * 2;
    } else if (gameState.ball.y >= 600 - gameState.ball.radius) {
        gameState.ball.y = 600 - gameState.ball.radius;
        gameState.ball.dy = -gameState.ball.dy * GAME_CONFIG.WALL_BOUNCE_FACTOR;
        gameState.ball.dy += (Math.random() - 0.5) * 2;
    }
    
    // Verificamos si la pelota golpea la paleta del jugador 1
    if (gameState.ball.x <= gameState.paddle1.x + gameState.paddle1.width + gameState.ball.radius &&
        gameState.ball.x >= gameState.paddle1.x - gameState.ball.radius &&
        gameState.ball.y >= gameState.paddle1.y - gameState.paddle1.height/2 &&
        gameState.ball.y <= gameState.paddle1.y + gameState.paddle1.height/2) {
        
        // Calcular punto de impacto para rebote realista
        const hitPoint = (gameState.ball.y - gameState.paddle1.y) / (gameState.paddle1.height / 2);
        const angle = hitPoint * Math.PI / 3; // Ángulo máximo de 60 grados
        
        gameState.ball.x = gameState.paddle1.x + gameState.paddle1.width + gameState.ball.radius;
        gameState.ball.dx = Math.abs(gameState.ball.dx) * GAME_CONFIG.PADDLE_BOUNCE_FACTOR;
        gameState.ball.dy = Math.sin(angle) * gameState.ball.dx;
        
        // Crear power-up ocasionalmente
        createPowerUp();
    }
    
    // Verificamos si la pelota golpea la paleta del jugador 2
    if (gameState.ball.x >= gameState.paddle2.x - gameState.paddle2.width - gameState.ball.radius &&
        gameState.ball.x <= gameState.paddle2.x + gameState.ball.radius &&
        gameState.ball.y >= gameState.paddle2.y - gameState.paddle2.height/2 &&
        gameState.ball.y <= gameState.paddle2.y + gameState.paddle2.height/2) {
        
        const hitPoint = (gameState.ball.y - gameState.paddle2.y) / (gameState.paddle2.height / 2);
        const angle = hitPoint * Math.PI / 3;
        
        gameState.ball.x = gameState.paddle2.x - gameState.paddle2.width - gameState.ball.radius;
        gameState.ball.dx = -Math.abs(gameState.ball.dx) * GAME_CONFIG.PADDLE_BOUNCE_FACTOR;
        gameState.ball.dy = Math.sin(angle) * Math.abs(gameState.ball.dx);
        
        createPowerUp();
    }
    
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
    
    // Limpiar power-ups expirados
    cleanExpiredPowerUps();
    
    // Animar línea central
    gameState.centerLine.offset = (gameState.centerLine.offset + 2) % 20;
}

// Función para actualizar las paletas con movimiento suave
function updatePaddles() {
    // Aplicar velocidad a las posiciones
    gameState.paddle1.y += gameState.paddle1.speed;
    gameState.paddle2.y += gameState.paddle2.speed;
    
    // Aplicar fricción para movimiento más suave
    gameState.paddle1.speed *= 0.8;
    gameState.paddle2.speed *= 0.8;
    
    // Limitar las paletas dentro del canvas
    gameState.paddle1.y = Math.max(50, Math.min(550, gameState.paddle1.y));
    gameState.paddle2.y = Math.max(50, Math.min(550, gameState.paddle2.y));
}

// Configuramos los eventos de Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);
    
    // Añadimos el jugador a la lista
    if (gameState.players.length < 2) {
        gameState.players.push(socket.id);
        
        // Si tenemos 2 jugadores, iniciamos el juego
        if (gameState.players.length === 2) {
            gameState.gameStatus = 'playing';
            io.emit('gameStart');
        }
    }
    
    // Enviamos el estado actual del juego al nuevo jugador
    socket.emit('gameState', gameState);
    
    // Manejamos el movimiento de las paletas con velocidad
    socket.on('movePaddle', (data) => {
        if (data.player === 1) {
            gameState.paddle1.speed = data.speed;
        } else if (data.player === 2) {
            gameState.paddle2.speed = data.speed;
        }
        
        // Enviamos la actualización a todos los clientes
        io.emit('paddleMoved', data);
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
            io.emit('gameState', gameState);
        }
    });
});

// Bucle del juego que se ejecuta cada 16ms (60 FPS)
setInterval(() => {
    updateBall();
    updatePaddles();
    // Enviamos el estado actualizado a todos los clientes
    io.emit('gameState', gameState);
}, 16);

// Configuramos el puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciamos el servidor
server.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`Abre http://localhost:${PORT} en tu navegador`);
});
