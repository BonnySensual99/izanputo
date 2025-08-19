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

// Variables del juego que se mantienen en el servidor
let gameState = {
    // Posiciones de las paletas (x, y)
    paddle1: { x: 50, y: 300 },
    paddle2: { x: 750, y: 300 },
    // Posición y velocidad de la pelota
    ball: { x: 400, y: 300, dx: 5, dy: 3 },
    // Puntuación de cada jugador
    score: { player1: 0, player2: 0 },
    // Estado del juego (esperando, jugando, terminado)
    gameStatus: 'waiting',
    // Jugadores conectados
    players: []
};

// Función para reiniciar el estado del juego
function resetGame() {
    gameState.ball = { x: 400, y: 300, dx: 5, dy: 3 };
    gameState.paddle1 = { x: 50, y: 300 };
    gameState.paddle2 = { x: 750, y: 300 };
    gameState.gameStatus = 'playing';
}

// Función para actualizar la posición de la pelota
function updateBall() {
    if (gameState.gameStatus !== 'playing') return;
    
    // Movemos la pelota según su velocidad
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;
    
    // Rebotamos la pelota en las paredes superior e inferior
    if (gameState.ball.y <= 0 || gameState.ball.y >= 600) {
        gameState.ball.dy = -gameState.ball.dy;
    }
    
    // Verificamos si la pelota golpea la paleta del jugador 1
    if (gameState.ball.x <= 70 && 
        gameState.ball.y >= gameState.paddle1.y - 50 && 
        gameState.ball.y <= gameState.paddle1.y + 50) {
        gameState.ball.dx = -gameState.ball.dx;
        // Añadimos un poco de aleatoriedad al rebote
        gameState.ball.dy += (Math.random() - 0.5) * 2;
    }
    
    // Verificamos si la pelota golpea la paleta del jugador 2
    if (gameState.ball.x >= 730 && 
        gameState.ball.y >= gameState.paddle2.y - 50 && 
        gameState.ball.y <= gameState.paddle2.y + 50) {
        gameState.ball.dx = -gameState.ball.dx;
        // Añadimos un poco de aleatoriedad al rebote
        gameState.ball.dy += (Math.random() - 0.5) * 2;
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
    
    // Manejamos el movimiento de las paletas
    socket.on('movePaddle', (data) => {
        // data.player indica qué jugador se está moviendo (1 o 2)
        if (data.player === 1) {
            gameState.paddle1.y = data.y;
        } else if (data.player === 2) {
            gameState.paddle2.y = data.y;
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
