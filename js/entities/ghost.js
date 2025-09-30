class Ghost {
  constructor(x, y, color, game) {
    this.gridX = Math.floor(x / CELL_SIZE);
    this.gridY = Math.floor(y / CELL_SIZE);
    this.targetX = this.gridX;
    this.targetY = this.gridY;
    this.x = this.gridX * CELL_SIZE + CELL_SIZE / 2;
    this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;
    this.color = color;
    this.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    this.moveProgress = 0.0;
    this.moveSpeed = GHOST_SPEED;
    this.size = CELL_SIZE - 4;
    this.animationTimer = 0;
    this.game = game;
    this.ai = null;
    this.decisionTimer = 0;
    this.decisionDelay = AI_DECISION_DELAY;
    this.lastDirection = { x: 0, y: 0 };
  }

  getColorName() {
    const colorNames = {
      [RED]: "Red",
      [BLUE]: "Blue",
      [PINK]: "Pink",
      [ORANGE]: "Orange",
    };
    return colorNames[this.color] || "Unknown";
  }

  setAI(ai) {
    this.ai = ai;
  }

  getValidDirections(walls, ghosts) {
    const validDirections = [];
    for (const direction of DIRECTIONS) {
      let nextX = this.gridX + direction.x;
      let nextY = this.gridY + direction.y;

      nextX = (nextX + this.game.mapWidth) % this.game.mapWidth;
      nextY = (nextY + this.game.mapHeight) % this.game.mapHeight;

      if (!walls.has(`${nextX},${nextY}`)) {
        validDirections.push(direction);
      }
    }
    return validDirections;
  }

  update(dt, walls, pacman, ghosts) {
    this.animationTimer += dt;
    this.decisionTimer += dt;

    if (this.gridX === this.targetX && this.gridY === this.targetY) {
      let newDirection = this.direction;

      if (this.ai && this.decisionTimer >= this.decisionDelay) {
        try {
          newDirection = this.ai.getNextDirection(walls, pacman, ghosts);
          this.decisionTimer = 0;
        } catch (e) {
          console.error("AI error:", e);
          const validDirs = this.getValidDirections(walls, ghosts);
          newDirection = validDirs.length > 0 ? validDirs[0] : { x: 0, y: 0 };
        }
      }

      if (newDirection.x !== 0 || newDirection.y !== 0) {
        let nextX = this.gridX + newDirection.x;
        let nextY = this.gridY + newDirection.y;

        nextX = (nextX + this.game.mapWidth) % this.game.mapWidth;
        nextY = (nextY + this.game.mapHeight) % this.game.mapHeight;

        let canMove = !walls.has(`${nextX},${nextY}`);

        if (canMove) {
          for (const otherGhost of ghosts) {
            if (otherGhost !== this) {
              if (
                (otherGhost.gridX === nextX && otherGhost.gridY === nextY) ||
                (otherGhost.targetX === nextX && otherGhost.targetY === nextY)
              ) {
                canMove = false;
                break;
              }
            }
          }
        }

        if (canMove) {
          this.direction = newDirection;
          this.targetX = nextX;
          this.targetY = nextY;
          this.moveProgress = 0.0;
          this.lastDirection = newDirection;
        } else {
          const fallbackDirs = this.getValidDirections(walls, ghosts);
          if (fallbackDirs.length > 0) {
            const altDirection = fallbackDirs[0];
            let altX = this.gridX + altDirection.x;
            let altY = this.gridY + altDirection.y;

            altX = (altX + this.game.mapWidth) % this.game.mapWidth;
            altY = (altY + this.game.mapHeight) % this.game.mapHeight;

            this.direction = altDirection;
            this.targetX = altX;
            this.targetY = altY;
            this.moveProgress = 0.0;
          } else {
            this.direction = { x: 0, y: 0 };
          }
        }
      }

      const isTunnelMove =
        Math.abs(this.targetX - this.gridX) > 1 ||
        Math.abs(this.targetY - this.gridY) > 1;

      if (isTunnelMove) {
        this.gridX = this.targetX;
        this.gridY = this.targetY;
        this.x = this.gridX * CELL_SIZE + CELL_SIZE / 2;
        this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;
        this.moveProgress = 0.0;
      } else {
        this.moveProgress = 0.0;
      }
    }

    if (this.gridX !== this.targetX || this.gridY !== this.targetY) {
      this.moveProgress += dt * this.moveSpeed;

      if (this.moveProgress >= 1.0) {
        this.gridX = this.targetX;
        this.gridY = this.targetY;
        this.moveProgress = 0.0;
        this.x = this.gridX * CELL_SIZE + CELL_SIZE / 2;
        this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;
      } else {
        this.x =
          (this.gridX + (this.targetX - this.gridX) * this.moveProgress) *
            CELL_SIZE +
          CELL_SIZE / 2;
        this.y =
          (this.gridY + (this.targetY - this.gridY) * this.moveProgress) *
            CELL_SIZE +
          CELL_SIZE / 2;
      }
    }
  }

  checkCollision(pacman) {
    return this.gridX === pacman.gridX && this.gridY === pacman.gridY;
  }

  draw(ctx) {
    const center = { x: Math.floor(this.x), y: Math.floor(this.y) };
    const halfSize = this.size / 2;

    // Body
    ctx.fillStyle = this.color;
    ctx.fillRect(
      center.x - halfSize,
      center.y - halfSize,
      this.size,
      this.size
    );

    // Head
    ctx.beginPath();
    ctx.arc(
      center.x,
      center.y - halfSize + halfSize / 2,
      halfSize,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Wavy bottom
    const bottomY = center.y + halfSize;
    const waveWidth = this.size / 4;

    for (let i = 0; i < 4; i++) {
      const x1 = center.x - halfSize + i * waveWidth;
      const x2 = x1 + waveWidth;
      const xMid = (x1 + x2) / 2;
      const waveOffset = 3 * Math.sin(this.animationTimer * 5 + i);

      ctx.beginPath();
      ctx.moveTo(x1, bottomY);
      ctx.lineTo(xMid, bottomY - waveWidth / 2 + waveOffset);
      ctx.lineTo(x2, bottomY);
      ctx.fill();
    }

    // Eyes
    const eyeSize = 3;
    const eyeY = center.y - halfSize / 2;

    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(center.x - halfSize / 2, eyeY, eyeSize, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center.x + halfSize / 2, eyeY, eyeSize, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.arc(center.x - halfSize / 2, eyeY, eyeSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center.x + halfSize / 2, eyeY, eyeSize / 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}
