// Initialize and start the game
let game;

function initGame() {
  const canvas = document.getElementById("gameCanvas");
  game = new Game(canvas);

  // Start the game loop
  requestAnimationFrame((time) => {
    game.lastTime = time;
    game.gameLoop(time);
  });

  // Update info display regularly
  setInterval(() => {
    if (game) {
      game.updateInfo();
    }
  }, 100);
}

// Start the game when page loads
window.addEventListener("load", initGame);
