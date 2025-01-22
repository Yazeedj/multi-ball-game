const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const port = 3000;

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const backEndPlayers = {};
const backEndProjectiles = {};
const SPEED = 2.5

;
const RADIUS = 10;
const PROJECTILE_RADIUS = 6;
let projectileId = 0;

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  io.emit('updatePlayers', backEndPlayers);

  // Initialize player
  socket.on('initGame', ({ username, width, height }) => {
    backEndPlayers[socket.id] = {
      id: socket.id,
      x: Math.random() * 1024,
      y: Math.random() * 576,
      radius: RADIUS,
      username: username || `Player-${socket.id}`,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      score: 0,
      canvas: { width, height },
    };
    console.log(`Player ${username} initialized.`);
    io.emit('updatePlayers', backEndPlayers);
  });

  // Handle player movement
  socket.on('keydown', ({ keycode }) => {
    const player = backEndPlayers[socket.id];
    if (!player) return;

    switch (keycode) {
      case 'KeyW': player.y = Math.max(player.radius, player.y - SPEED); break;
      case 'KeyA': player.x = Math.max(player.radius, player.x - SPEED); break;
      case 'KeyS': player.y = Math.min(576 - player.radius, player.y + SPEED); break;
      case 'KeyD': player.x = Math.min(1024 - player.radius, player.x + SPEED); break;
    }

    io.emit('updatePlayers', backEndPlayers);
  });

  // Handle shooting projectiles
  socket.on('shoot', ({ angle }) => {
    const player = backEndPlayers[socket.id];
    if (!player) return;
    const SPEED = 1

    projectileId++;
    backEndProjectiles[projectileId] = {

      id: projectileId,
      x: player.x,
      y: player.y,
      radius: PROJECTILE_RADIUS,

      velocity: {
        x: Math.cos(angle) * SPEED,
        y: Math.sin(angle) * SPEED,
      },
      playerId: socket.id,
      color: player.color || 'red', // Assign projectile color based on player color

    };
    io.emit('updateProjectiles', backEndProjectiles);
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete backEndPlayers[socket.id];
    io.emit('updatePlayers', backEndPlayers);
  });

  // Handle replay when a player chooses to replay after dying
  socket.on('replay', ({ username }) => {
    backEndPlayers[socket.id] = {
      id: socket.id,
      x: Math.random() * 1024,
      y: Math.random() * 576,
      radius: RADIUS,
      username: username || `Player-${socket.id}`,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      score: 0,
      canvas: { width: 1024, height: 576 },
    };
    console.log(`Player ${username} chose to replay.`);
    io.emit('updatePlayers', backEndPlayers);
  });

  // Game loop for updating projectiles and detecting collisions
  setInterval(() => {
    for (const id in backEndProjectiles) {
      const projectile = backEndProjectiles[id];
      projectile.x += projectile.velocity.x;
      projectile.y += projectile.velocity.y;

      // Remove projectiles that go out of bounds
      if (
        projectile.x < 0 ||
        projectile.x > 1024 ||
        projectile.y < 0 ||
        projectile.y > 576
      ) {
        delete backEndProjectiles[id];
        continue;
      }

      // Check collisions with players
      for (const playerId in backEndPlayers) {
        const player = backEndPlayers[playerId];
        if (!player || projectile.playerId === playerId) continue; // Skip the shooter

        const dx = projectile.x - player.x;
        const dy = projectile.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + projectile.radius) {
          console.log(`Player ${playerId} hit by projectile ${id}`);
          delete backEndProjectiles[id];

          // Increment score of the shooter
          if (backEndPlayers[projectile.playerId]) {
            backEndPlayers[projectile.playerId].score++;
          }

          // Notify the hit player and remove them
          io.to(playerId).emit('gameOver'); // Notify frontend for game over
          delete backEndPlayers[playerId];
          io.emit('updatePlayers', backEndPlayers);
          break;
        }
      }
    }

    io.emit('updateProjectiles', backEndProjectiles);
  }, 15);
});

server.listen(port, () => {
  console.log(`Game server running on port ${port}`);
});
