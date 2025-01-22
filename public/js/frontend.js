const canvas = document.querySelector('#gameCanvas');
const c = canvas.getContext('2d');
const socket = io();

let frontEndPlayers = {};
let frontEndProjectiles = {};
let gameOver = false;

// Resize canvas dynamically
function resizeCanvas() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const deviceWidth = window.innerWidth;
  const deviceHeight = window.innerHeight;

  const scale = Math.min(deviceWidth / 1024, deviceHeight / 576);

  canvas.width = 1024 * scale * devicePixelRatio;
  canvas.height = 576 * scale * devicePixelRatio;

  c.setTransform(scale * devicePixelRatio, 0, 0, scale * devicePixelRatio, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Grid Drawing
function drawGrid() {
  c.strokeStyle = '#2c2c2c';
  const gridSize = 50;

  for (let x = 0; x < canvas.width; x += gridSize) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, canvas.height);
    c.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(canvas.width, y);
    c.stroke();
  }
}

// Update and draw players and projectiles
socket.on('updatePlayers', (players) => {
  frontEndPlayers = players;
});

socket.on('updateProjectiles', (projectiles) => {
  frontEndProjectiles = projectiles;
});

function animate() {
  if (gameOver) return;
  requestAnimationFrame(animate);

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = 'black';
  c.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  Object.values(frontEndPlayers).forEach(player => {
    c.beginPath();
    c.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    c.fillStyle = player.color;
    c.fill();
  });

  Object.values(frontEndProjectiles).forEach(projectile => {
    c.beginPath();
    c.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    c.fillStyle = 'red';
    c.fill();
  });
}

animate();

// Game Over Handling
socket.on('gameOver', () => {
  gameOver = true;
  const gameOverDiv = document.createElement('div');
  gameOverDiv.id = 'gameOverScreen';
  gameOverDiv.style = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 1000;
    `;
  gameOverDiv.innerHTML = `
        <h1 style="color: white;">Game Over</h1>
        <button id="restartButton" style="padding: 10px 20px; background: #1f2937; color: white; border: none; border-radius: 5px; cursor: pointer;">Restart</button>
    `;
  document.body.appendChild(gameOverDiv);

  document.querySelector('#restartButton').addEventListener('click', restartGame);
});

// Restart Game
function restartGame() {
  const gameOverScreen = document.querySelector('#gameOverScreen');
  if (gameOverScreen) gameOverScreen.remove();

  gameOver = false;
  frontEndPlayers = {};
  frontEndProjectiles = {};

  socket.emit('replay', {
    username: document.querySelector('#usernameInput').value || 'Player',
  });

  animate();
}

// Handle movement and input
const keys = { w: false, a: false, s: false, d: false };
setInterval(() => {
  if (keys.w) socket.emit('keydown', { keycode: 'KeyW' });
  if (keys.a) socket.emit('keydown', { keycode: 'KeyA' });
  if (keys.s) socket.emit('keydown', { keycode: 'KeyS' });
  if (keys.d) socket.emit('keydown', { keycode: 'KeyD' });
}, 15);

window.addEventListener('keydown', (event) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    keys[event.code.slice(-1).toLowerCase()] = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    keys[event.code.slice(-1).toLowerCase()] = false;
  }
});

// Username Form
document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#usernameFormContainer').style.display = 'none';

  const username = document.querySelector('#usernameInput').value || 'Player';
  socket.emit('initGame', { username });
});
