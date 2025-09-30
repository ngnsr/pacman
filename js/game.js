// Main Game class
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mapWidth = 0;
    this.mapHeight = 0;

    this.difficultyManager = new DifficultyManager();
    this.ghostAIs = [];

    this.mapLoader = new MapLoader();
    this.loadMap(DEFAULT_MAP);

    this.state = GAME_PLAYING;

    this.setupEventListeners();
    this.lastTime = 0;
  }

  loadMap(mapData) {
    const mapInfo = this.mapLoader.loadMap(mapData);
    this.walls = mapInfo.walls;
    this.mapWidth =
      Math.max(
        ...Array.from(mapInfo.walls).map((pos) => parseInt(pos.split(",")[0]))
      ) + 1;
    this.mapHeight =
      Math.max(
        ...Array.from(mapInfo.walls).map((pos) => parseInt(pos.split(",")[1]))
      ) + 1;
    this.dots = new Set(mapInfo.dots);
    this.totalDots = this.dots.size;

    this.pacman = new Pacman(
      mapInfo.pacmanStart.x,
      mapInfo.pacmanStart.y,
      this
    );

    this.ghosts = [];
    const colors = [RED, BLUE, PINK, ORANGE];
    mapInfo.ghostStarts.forEach((ghostStart, i) => {
      const color = colors[i % colors.length];
      const ghost = new Ghost(ghostStart.x, ghostStart.y, color, this);
      this.ghosts.push(ghost);
    });

    this.setupGhostAI();
  }

  setupGhostAI() {
    this.ghostAIs = this.difficultyManager.createGhostAIs(this.ghosts, this);

    this.ghosts.forEach((ghost, i) => {
      if (i < this.ghostAIs.length) {
        ghost.setAI(this.ghostAIs[i]);
      }
    });
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handleKeyDown(event) {
    if (this.state === GAME_PLAYING) {
      if (event.key === "Escape") {
        this.state = GAME_PAUSED;
      } else if (
        event.key === "ArrowUp" ||
        event.key === "w" ||
        event.key === "W"
      ) {
        this.pacman.setDirection(UP);
      } else if (
        event.key === "ArrowDown" ||
        event.key === "s" ||
        event.key === "S"
      ) {
        this.pacman.setDirection(DOWN);
      } else if (
        event.key === "ArrowLeft" ||
        event.key === "a" ||
        event.key === "A"
      ) {
        this.pacman.setDirection(LEFT);
      } else if (
        event.key === "ArrowRight" ||
        event.key === "d" ||
        event.key === "D"
      ) {
        this.pacman.setDirection(RIGHT);
      } else if (event.key === "+" || event.key === "=") {
        if (this.difficultyManager.nextLevel()) {
          this.setupGhostAI();
        }
      } else if (event.key === "-") {
        if (this.difficultyManager.prevLevel()) {
          this.setupGhostAI();
        }
      }
    } else if (this.state === GAME_PAUSED) {
      if (event.key === "Escape") {
        this.state = GAME_PLAYING;
      } else if (event.key === "r" || event.key === "R") {
        this.restartGame();
      } else if (event.key === "+" || event.key === "=") {
        if (this.difficultyManager.nextLevel()) {
          this.setupGhostAI();
        }
      } else if (event.key === "-") {
        if (this.difficultyManager.prevLevel()) {
          this.setupGhostAI();
        }
      } else if (event.key >= "1" && event.key <= "4") {
        const levelIndex = parseInt(event.key) - 1;
        if (this.difficultyManager.setLevel(levelIndex)) {
          this.setupGhostAI();
        }
      }
    } else if (this.state === GAME_WON || this.state === GAME_LOST) {
      if (event.key === "r" || event.key === "R") {
        this.restartGame();
      } else if (event.key === "Escape") {
        // Could add quit functionality here
      } else if (event.key === "+" || event.key === "=") {
        if (this.difficultyManager.nextLevel()) {
          this.setupGhostAI();
        }
      } else if (event.key === "-") {
        if (this.difficultyManager.prevLevel()) {
          this.setupGhostAI();
        }
      }
    }
  }

  restartGame() {
    this.loadMap(DEFAULT_MAP);
    this.state = GAME_PLAYING;
  }

  update(dt) {
    if (this.state !== GAME_PLAYING) return;

    this.dt = dt;

    this.pacman.update(dt, this.walls);

    // Check dot collection
    const pacmanGridPos = `${this.pacman.gridX},${this.pacman.gridY}`;
    if (this.dots.has(pacmanGridPos)) {
      this.dots.delete(pacmanGridPos);
    }

    if (this.dots.size === 0) {
      this.state = GAME_WON;
      return;
    }

    // Update ghosts
    for (const ghost of this.ghosts) {
      ghost.update(dt, this.walls, this.pacman, this.ghosts);
      if (ghost.checkCollision(this.pacman)) {
        this.state = GAME_LOST;
        return;
      }
    }
  }

  draw() {
    this.ctx.fillStyle = BLACK;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw walls
    this.ctx.fillStyle = BLUE;
    for (const wallPos of this.walls) {
      const [x, y] = wallPos.split(",").map(Number);
      this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Draw dots
    this.ctx.fillStyle = WHITE;
    for (const dotPos of this.dots) {
      const [x, y] = dotPos.split(",").map(Number);
      this.ctx.beginPath();
      this.ctx.arc(
        x * CELL_SIZE + CELL_SIZE / 2,
        y * CELL_SIZE + CELL_SIZE / 2,
        3,
        0,
        2 * Math.PI
      );
      this.ctx.fill();
    }

    // Draw pacman
    this.pacman.draw(this.ctx);

    // Draw ghosts
    for (const ghost of this.ghosts) {
      ghost.draw(this.ctx);
    }

    // Draw UI
    this.drawUI();

    if (this.state === GAME_PAUSED) {
      this.drawPauseScreen();
    } else if (this.state === GAME_WON) {
      this.drawWinScreen();
    } else if (this.state === GAME_LOST) {
      this.drawLoseScreen();
    }
  }

  drawUI() {
    this.ctx.fillStyle = WHITE;
    this.ctx.font = "16px Arial";

    const eatenDots = this.totalDots - this.dots.size;
    this.ctx.fillText(`Score: ${eatenDots}/${this.totalDots}`, 10, 25);

    const currentLevel = this.difficultyManager.getCurrentLevel();
    this.ctx.textAlign = "right";
    this.ctx.font = "14px Arial";
    this.ctx.fillText(
      `${currentLevel.name} (${this.difficultyManager.currentLevel + 1}/4)`,
      this.canvas.width - 10,
      20
    );

    this.ctx.fillStyle = CYAN;
    this.ctx.font = "12px Arial";
    this.ctx.fillText("+/- difficulty", this.canvas.width - 10, 35);

    this.ctx.textAlign = "left";
  }

  drawPauseScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = WHITE;
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "PAUSED",
      this.canvas.width / 2,
      this.canvas.height / 2 - 100
    );

    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "Press R to restart",
      this.canvas.width / 2,
      this.canvas.height / 2 - 30
    );

    this.ctx.fillStyle = YELLOW;
    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      "DIFFICULTY LEVELS:",
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );

    let yOffset = 50;
    this.difficultyManager.levels.forEach((level, i) => {
      const color = i === this.difficultyManager.currentLevel ? GREEN : WHITE;
      const prefix = i === this.difficultyManager.currentLevel ? "> " : "";

      this.ctx.fillStyle = color;
      this.ctx.font = "16px Arial";
      this.ctx.fillText(
        `${prefix}${i + 1}. ${level.name}`,
        this.canvas.width / 2,
        this.canvas.height / 2 + yOffset
      );
      yOffset += 25;

      if (i === this.difficultyManager.currentLevel) {
        this.ctx.fillStyle = CYAN;
        this.ctx.font = "12px Arial";
        this.ctx.fillText(
          level.description,
          this.canvas.width / 2,
          this.canvas.height / 2 + yOffset
        );
        yOffset += 20;
      }
    });

    this.ctx.fillStyle = CYAN;
    this.ctx.font = "14px Arial";
    this.ctx.fillText(
      "Use +/- or number keys (1-4) to change",
      this.canvas.width / 2,
      this.canvas.height / 2 + yOffset + 20
    );

    this.ctx.textAlign = "left";
  }

  drawWinScreen() {
    this.ctx.fillStyle = "rgba(0, 100, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = WHITE;
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "YOU WIN!",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "All dots collected!",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.fillText(
      "Press R to restart",
      this.canvas.width / 2,
      this.canvas.height / 2 + 30
    );

    this.ctx.fillStyle = YELLOW;
    this.ctx.font = "16px Arial";
    this.ctx.fillText(
      "Use +/- to change difficulty",
      this.canvas.width / 2,
      this.canvas.height / 2 + 90
    );

    this.ctx.textAlign = "left";
  }

  drawLoseScreen() {
    this.ctx.fillStyle = "rgba(100, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = WHITE;
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "GAME OVER!",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "Ghost caught you!",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.fillText(
      "Press R to restart",
      this.canvas.width / 2,
      this.canvas.height / 2 + 30
    );

    this.ctx.fillStyle = YELLOW;
    this.ctx.font = "16px Arial";
    this.ctx.fillText(
      "Use +/- to change difficulty",
      this.canvas.width / 2,
      this.canvas.height / 2 + 90
    );

    this.ctx.textAlign = "left";
  }

  gameLoop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000.0;
    this.lastTime = currentTime;

    if (dt < 1.0) {
      this.update(dt);
    }

    this.draw();

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  updateInfo() {
    const gameInfoElement = document.getElementById("gameInfo");
    const currentLevel = this.difficultyManager.getCurrentLevel();
    const eatenDots = this.totalDots - this.dots.size;

    gameInfoElement.innerHTML = `
      <strong>Score:</strong> ${eatenDots}/${this.totalDots} dots collected<br>
      <strong>Difficulty:</strong> ${currentLevel.name} (Level ${
      this.difficultyManager.currentLevel + 1
    })<br>
      <strong>Description:</strong> ${currentLevel.description}<br>
      <strong>Active AI Rules:</strong> ${this.difficultyManager.getActiveRulesDescription()}
    `;

    const debugElement = document.getElementById("debugInfo");
    const ghostInfo = this.ghosts
      .map((ghost, i) => {
        const ai = this.ghostAIs[i];
        const ruleNames = ai
          ? ai.rules.map((rule) => rule.constructor.name).join(", ")
          : "No AI";
        return `Ghost ${i + 1} (${ghost.getColorName()}): ${ruleNames}`;
      })
      .join("<br>");

    debugElement.innerHTML = `
      <strong>Ghost AI Debug:</strong><br>
      ${ghostInfo}<br>
      <strong>Game State:</strong> ${this.state}<br>
      <strong>Map Size:</strong> ${this.mapWidth}x${this.mapHeight}
    `;
  }
}
