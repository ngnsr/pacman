class Pacman {
  constructor(x, y, game) {
    this.gridX = Math.floor(x / CELL_SIZE);
    this.gridY = Math.floor(y / CELL_SIZE);
    this.targetX = this.gridX;
    this.targetY = this.gridY;
    this.x = this.gridX * CELL_SIZE + CELL_SIZE / 2;
    this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;
    this.direction = { x: 0, y: 0 };
    this.nextDirection = { x: 0, y: 0 };
    this.moveProgress = 0.0;
    this.moveSpeed = PACMAN_SPEED;
    this.radius = CELL_SIZE / 2 - 2;
    this.mouthAngle = 0;
    this.mouthOpening = true;
    this.game = game;
  }

  setDirection(direction) {
    this.nextDirection = direction;
  }

  canMove(direction, walls) {
    let nextX = this.gridX + direction.x;
    let nextY = this.gridY + direction.y;

    nextX = (nextX + this.game.mapWidth) % this.game.mapWidth;
    nextY = (nextY + this.game.mapHeight) % this.game.mapHeight;

    return !walls.has(`${nextX},${nextY}`);
  }

  update(dt, walls) {
    if (this.gridX === this.targetX && this.gridY === this.targetY) {
      if (this.nextDirection.x !== 0 || this.nextDirection.y !== 0) {
        if (this.canMove(this.nextDirection, walls)) {
          this.direction = this.nextDirection;
          this.nextDirection = { x: 0, y: 0 };
        }
      }

      if (
        (this.direction.x !== 0 || this.direction.y !== 0) &&
        this.canMove(this.direction, walls)
      ) {
        this.targetX = this.gridX + this.direction.x;
        this.targetY = this.gridY + this.direction.y;

        this.targetX = (this.targetX + this.game.mapWidth) % this.game.mapWidth;
        this.targetY =
          (this.targetY + this.game.mapHeight) % this.game.mapHeight;

        this.moveProgress = 0.0;

        const isTunnelMove =
          Math.abs(this.targetX - this.gridX) > 1 ||
          Math.abs(this.targetY - this.gridY) > 1;

        if (isTunnelMove) {
          this.gridX = this.targetX;
          this.gridY = this.targetY;
          this.x = this.gridX * CELL_SIZE + CELL_SIZE / 2;
          this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;
          this.moveProgress = 0.0;
        }
      }
    }

    if (this.gridX !== this.targetX || this.gridY !== this.targetY) {
      this.moveProgress += dt * this.moveSpeed;

      if (this.moveProgress >= 1.0) {
        this.gridX = this.targetX;
        this.gridY = this.targetY;
        this.moveProgress = 0.0;
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

    // Mouth animation
    if (this.direction.x !== 0 || this.direction.y !== 0) {
      if (this.mouthOpening) {
        this.mouthAngle += 300 * dt;
        if (this.mouthAngle >= 45) {
          this.mouthAngle = 45;
          this.mouthOpening = false;
        }
      } else {
        this.mouthAngle -= 300 * dt;
        if (this.mouthAngle <= 0) {
          this.mouthAngle = 0;
          this.mouthOpening = true;
        }
      }
    }
  }

  draw(ctx) {
    const center = { x: Math.floor(this.x), y: Math.floor(this.y) };

    ctx.fillStyle = YELLOW;
    ctx.beginPath();

    if (this.direction.x === 0 && this.direction.y === 0) {
      ctx.arc(center.x, center.y, this.radius, 0, 2 * Math.PI);
    } else {
      let angleOffset = 0;
      if (this.direction.x === 1) angleOffset = 0;
      else if (this.direction.y === 1) angleOffset = Math.PI / 2;
      else if (this.direction.x === -1) angleOffset = Math.PI;
      else if (this.direction.y === -1) angleOffset = (3 * Math.PI) / 2;

      const mouthRadians = (this.mouthAngle * Math.PI) / 180;
      const startAngle = angleOffset + mouthRadians;
      const endAngle = angleOffset - mouthRadians;

      ctx.arc(center.x, center.y, this.radius, startAngle, endAngle);
      ctx.lineTo(center.x, center.y);
    }

    ctx.fill();

    // Eye
    ctx.fillStyle = BLACK;
    let eyePos = { x: center.x, y: center.y - 5 };
    if (this.direction.x === 1) eyePos = { x: center.x - 3, y: center.y - 5 };
    else if (this.direction.x === -1)
      eyePos = { x: center.x + 3, y: center.y - 5 };
    else if (this.direction.y === 1)
      eyePos = { x: center.x + 5, y: center.y + 3 };
    else if (this.direction.y === -1)
      eyePos = { x: center.x - 5, y: center.y - 3 };

    ctx.beginPath();
    ctx.arc(eyePos.x, eyePos.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}
