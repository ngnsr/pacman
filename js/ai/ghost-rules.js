// Ghost AI Rules Base Class
class GhostRule {
  constructor(priority = 1.0, enabled = true) {
    this.priority = priority;
    this.enabled = enabled;
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    return [null, 0.0];
  }
}

// Enhanced Vision Rule with line of sight, sound detection, and memory
class EnhancedVisionRule extends GhostRule {
  constructor(
    sightRadius = 5,
    soundRadius = 2,
    memoryDuration = 2000,
    priority = 3.0
  ) {
    super(priority);
    this.sightRadius = sightRadius;
    this.soundRadius = soundRadius;
    this.memoryDuration = memoryDuration;
    this.lastKnownPacmanPos = null;
    this.lastSeenTime = 0;
  }

  detectPacman(ghostAI, pacman, walls, currentTime) {
    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    let pacmanPos = { x: pacman.gridX, y: pacman.gridY };
    const distance = Math.sqrt(
      Math.pow(ghostPos.x - pacmanPos.x, 2) +
        Math.pow(ghostPos.y - pacmanPos.y, 2)
    );

    let detected = false;
    let detectionConfidence = 0.0;
    let detectionMethod = "none";

    // Direct sight
    if (
      distance <= this.sightRadius &&
      this.hasLineOfSight(ghostPos, pacmanPos, walls)
    ) {
      detected = true;
      detectionConfidence = Math.min(1.0, this.sightRadius / (distance + 0.1));
      detectionMethod = "sight";
    }
    // Sound detection
    else if (
      distance <= this.soundRadius &&
      (pacman.direction.x !== 0 || pacman.direction.y !== 0)
    ) {
      detected = true;
      detectionConfidence = 0.6 * (this.soundRadius / (distance + 0.1));
      detectionMethod = "sound";
    }
    // Network information
    else {
      const [sharedPos, sharedConfidence] = ghostNetwork.getSharedPacmanInfo(
        ghostPos,
        currentTime
      );
      if (sharedPos && sharedConfidence > 0.2) {
        pacmanPos = sharedPos;
        detectionConfidence = sharedConfidence * 0.85;
        detected = true;
        detectionMethod = "network";
      }
    }

    // Memory
    if (!detected && this.lastKnownPacmanPos) {
      const memoryAge = currentTime - this.lastSeenTime;
      if (memoryAge < this.memoryDuration) {
        pacmanPos = this.lastKnownPacmanPos;
        detectionConfidence = 0.3 * (1 - memoryAge / this.memoryDuration);
        detected = true;
        detectionMethod = "memory";
      }
    }

    // Update memory and network
    if (detectionMethod === "sight" || detectionMethod === "sound") {
      this.lastKnownPacmanPos = pacmanPos;
      this.lastSeenTime = currentTime;
      ghostNetwork.sharePacmanSighting(
        ghostPos,
        pacmanPos,
        currentTime,
        detectionConfidence
      );
    }

    return [detected, pacmanPos, detectionConfidence, detectionMethod];
  }

  hasLineOfSight(ghostPos, pacmanPos, walls) {
    if (ghostPos.x === pacmanPos.x && ghostPos.y === pacmanPos.y) return true;

    const dx = Math.abs(pacmanPos.x - ghostPos.x);
    const dy = Math.abs(pacmanPos.y - ghostPos.y);
    const sx = ghostPos.x < pacmanPos.x ? 1 : -1;
    const sy = ghostPos.y < pacmanPos.y ? 1 : -1;
    let err = dx - dy;

    let x = ghostPos.x;
    let y = ghostPos.y;

    while (true) {
      const posKey = `${x},${y}`;
      if (
        posKey !== `${ghostPos.x},${ghostPos.y}` &&
        posKey !== `${pacmanPos.x},${pacmanPos.y}` &&
        walls.has(posKey)
      ) {
        return false;
      }

      if (x === pacmanPos.x && y === pacmanPos.y) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    const currentTime = Date.now();
    const [detected, targetPos, confidence, method] = this.detectPacman(
      ghostAI,
      pacman,
      walls,
      currentTime
    );

    if (!detected || confidence < 0.1) return [null, 0.0];

    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    const avoidPositions = new Set();
    otherGhosts.forEach((g) => {
      if (g !== ghostAI.ghost) {
        avoidPositions.add(`${g.gridX},${g.gridY}`);
      }
    });

    const direction = bfsNextStep(
      ghostPos,
      targetPos,
      walls,
      ghostAI.game.mapWidth,
      ghostAI.game.mapHeight,
      avoidPositions
    );

    if (direction) {
      let strength = confidence * this.priority;

      if (method === "sight") strength *= 1.2;
      else if (method === "sound") strength *= 1.0;
      else if (method === "network") strength *= 0.8;
      else strength *= 0.6; // memory

      return [direction, strength];
    }

    return [null, 0.0];
  }
}

// Intelligent Wander Rule with exploration and history
class IntelligentWanderRule extends GhostRule {
  constructor(priority = 0.8) {
    super(priority);
    this.positionHistory = [];
    this.directionHistory = [];
    this.explorationBonus = new Map();
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    const currentTime = Date.now();

    this.positionHistory.push(`${ghostPos.x},${ghostPos.y}`);
    if (this.positionHistory.length > 8) {
      this.positionHistory.shift();
    }

    const validDirs = [];
    for (const direction of DIRECTIONS) {
      const nextX =
        (ghostPos.x + direction.x + ghostAI.game.mapWidth) %
        ghostAI.game.mapWidth;
      const nextY =
        (ghostPos.y + direction.y + ghostAI.game.mapHeight) %
        ghostAI.game.mapHeight;
      const nextPosKey = `${nextX},${nextY}`;

      if (!walls.has(nextPosKey)) {
        let collision = false;
        for (const ghost of otherGhosts) {
          if (ghost !== ghostAI.ghost) {
            if (
              (ghost.gridX === nextX && ghost.gridY === nextY) ||
              (ghost.targetX === nextX && ghost.targetY === nextY)
            ) {
              collision = true;
              break;
            }
          }
        }

        if (!collision) {
          validDirs.push({ direction, nextPos: { x: nextX, y: nextY } });
        }
      }
    }

    if (validDirs.length === 0) return [null, 0.0];

    // Score each direction
    const scoredDirs = validDirs.map(({ direction, nextPos }) => {
      let score = 0.0;
      const nextPosKey = `${nextPos.x},${nextPos.y}`;

      // Avoid recently visited places
      const recentVisits = this.positionHistory.filter(
        (pos) => pos === nextPosKey
      ).length;
      score -= recentVisits * 0.3;

      // Avoid going backwards
      if (this.directionHistory.length > 0) {
        const lastDir = this.directionHistory[this.directionHistory.length - 1];
        if (direction.x === -lastDir.x && direction.y === -lastDir.y) {
          score -= 0.4;
        }
      }

      // Exploration bonus
      if (!this.explorationBonus.has(nextPosKey)) {
        this.explorationBonus.set(nextPosKey, currentTime);
        score += 0.3;
      } else {
        const age = currentTime - this.explorationBonus.get(nextPosKey);
        if (age > 10000) {
          score += 0.2;
        }
      }

      return { direction, score };
    });

    scoredDirs.sort((a, b) => b.score - a.score);

    // Choose from top choices with randomness
    const topChoices = scoredDirs.slice(0, 2);
    let chosenDirection;

    if (topChoices.length >= 2) {
      chosenDirection =
        Math.random() < 0.67
          ? topChoices[0].direction
          : topChoices[1].direction;
    } else {
      chosenDirection = topChoices[0].direction;
    }

    this.directionHistory.push(chosenDirection);
    if (this.directionHistory.length > 4) {
      this.directionHistory.shift();
    }

    return [chosenDirection, this.priority];
  }
}

// Smart Patrol Rule
class SmartPatrolRule extends GhostRule {
  constructor(patrolPoints = [], priority = 1.5) {
    super(priority);
    this.patrolPoints = patrolPoints;
    this.currentTarget = 0;
    this.patrolCompletionCount = 0;
    this.adaptivePriority = priority;
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    if (this.patrolPoints.length === 0) return [null, 0.0];

    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    let targetPos = this.patrolPoints[this.currentTarget];

    if (ghostPos.x === targetPos.x && ghostPos.y === targetPos.y) {
      this.currentTarget = (this.currentTarget + 1) % this.patrolPoints.length;
      if (this.currentTarget === 0) {
        this.patrolCompletionCount++;
        this.adaptivePriority = Math.max(
          0.5,
          this.priority - this.patrolCompletionCount * 0.1
        );
      }
      targetPos = this.patrolPoints[this.currentTarget];
    }

    const avoidPositions = new Set();
    otherGhosts.forEach((g) => {
      if (g !== ghostAI.ghost) {
        avoidPositions.add(`${g.gridX},${g.gridY}`);
      }
    });

    const direction = bfsNextStep(
      ghostPos,
      targetPos,
      walls,
      ghostAI.game.mapWidth,
      ghostAI.game.mapHeight,
      avoidPositions
    );

    return direction ? [direction, this.adaptivePriority] : [null, 0.0];
  }
}

// Predict Pacman Movement Rule
class PredictPacmanRule extends GhostRule {
  constructor(predictionSteps = 3, priority = 2.5) {
    super(priority);
    this.predictionSteps = predictionSteps;
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    if (pacman.direction.x === 0 && pacman.direction.y === 0)
      return [null, 0.0];

    const predX = pacman.gridX + pacman.direction.x * this.predictionSteps;
    const predY = pacman.gridY + pacman.direction.y * this.predictionSteps;
    const predPos = {
      x: (predX + ghostAI.game.mapWidth) % ghostAI.game.mapWidth,
      y: (predY + ghostAI.game.mapHeight) % ghostAI.game.mapHeight,
    };

    if (walls.has(`${predPos.x},${predPos.y}`)) return [null, 0.0];

    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    const avoidPositions = new Set();
    otherGhosts.forEach((g) => {
      if (g !== ghostAI.ghost) {
        avoidPositions.add(`${g.gridX},${g.gridY}`);
      }
    });

    const direction = bfsNextStep(
      ghostPos,
      predPos,
      walls,
      ghostAI.game.mapWidth,
      ghostAI.game.mapHeight,
      avoidPositions
    );

    if (direction) {
      const distance = Math.sqrt(
        Math.pow(ghostPos.x - predPos.x, 2) +
          Math.pow(ghostPos.y - predPos.y, 2)
      );
      const strength = Math.min(1.0, 10.0 / (distance + 1));
      return [direction, strength * this.priority];
    }

    return [null, 0.0];
  }
}

// Flank Pacman Rule
class FlankPacmanRule extends GhostRule {
  constructor(priority = 2.0) {
    super(priority);
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    if (pacman.direction.x === 0 && pacman.direction.y === 0)
      return [null, 0.0];

    const predX = pacman.gridX + pacman.direction.x * 3;
    const predY = pacman.gridY + pacman.direction.y * 3;

    let flankPositions = [];
    if (pacman.direction.x !== 0) {
      flankPositions = [
        { x: predX, y: predY + 2 },
        { x: predX, y: predY - 2 },
      ];
    } else {
      flankPositions = [
        { x: predX + 2, y: predY },
        { x: predX - 2, y: predY },
      ];
    }

    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    const avoidPositions = new Set();
    otherGhosts.forEach((g) => {
      if (g !== ghostAI.ghost) {
        avoidPositions.add(`${g.gridX},${g.gridY}`);
      }
    });

    for (const targetPos of flankPositions) {
      const normPos = {
        x: (targetPos.x + ghostAI.game.mapWidth) % ghostAI.game.mapWidth,
        y: (targetPos.y + ghostAI.game.mapHeight) % ghostAI.game.mapHeight,
      };

      if (!walls.has(`${normPos.x},${normPos.y}`)) {
        const direction = bfsNextStep(
          ghostPos,
          normPos,
          walls,
          ghostAI.game.mapWidth,
          ghostAI.game.mapHeight,
          avoidPositions
        );
        if (direction) {
          const distance = Math.sqrt(
            Math.pow(ghostPos.x - normPos.x, 2) +
              Math.pow(ghostPos.y - normPos.y, 2)
          );
          const strength = Math.min(1.0, 5.0 / (distance + 0.1));
          return [direction, strength * this.priority];
        }
      }
    }

    return [null, 0.0];
  }
}

// Avoid Other Ghosts Rule
class AvoidOtherGhostsRule extends GhostRule {
  constructor(minDistance = 2, priority = 1.5) {
    super(priority);
    this.minDistance = minDistance;
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };

    const closeGhosts = otherGhosts.filter((ghost) => {
      if (ghost === ghostAI.ghost) return false;
      const distance = Math.sqrt(
        Math.pow(ghost.gridX - ghostPos.x, 2) +
          Math.pow(ghost.gridY - ghostPos.y, 2)
      );
      return distance < this.minDistance;
    });

    if (closeGhosts.length === 0) return [null, 0.0];

    const validDirs = [];
    for (const direction of DIRECTIONS) {
      const nextX =
        (ghostPos.x + direction.x + ghostAI.game.mapWidth) %
        ghostAI.game.mapWidth;
      const nextY =
        (ghostPos.y + direction.y + ghostAI.game.mapHeight) %
        ghostAI.game.mapHeight;

      if (!walls.has(`${nextX},${nextY}`)) {
        const totalDistance = closeGhosts.reduce((sum, closeGhost) => {
          const dist = Math.sqrt(
            Math.pow(closeGhost.gridX - nextX, 2) +
              Math.pow(closeGhost.gridY - nextY, 2)
          );
          return sum + dist;
        }, 0);

        validDirs.push({ direction, totalDistance });
      }
    }

    if (validDirs.length > 0) {
      const bestDirection = validDirs.reduce((best, current) =>
        current.totalDistance > best.totalDistance ? current : best
      ).direction;

      const minDistanceToGhost = Math.min(
        ...closeGhosts.map((g) =>
          Math.sqrt(
            Math.pow(g.gridX - ghostPos.x, 2) +
              Math.pow(g.gridY - ghostPos.y, 2)
          )
        )
      );
      const strength =
        (this.minDistance - minDistanceToGhost) / this.minDistance;

      return [bestDirection, strength * this.priority];
    }

    return [null, 0.0];
  }
}

// Block Escape Route Rule
class BlockEscapeRoute extends GhostRule {
  constructor(priority = 2.2) {
    super(priority);
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    const pacmanPos = { x: pacman.gridX, y: pacman.gridY };
    const exitPositions = [];

    for (const direction of DIRECTIONS) {
      const exitX =
        (pacman.gridX + direction.x + ghostAI.game.mapWidth) %
        ghostAI.game.mapWidth;
      const exitY =
        (pacman.gridY + direction.y + ghostAI.game.mapHeight) %
        ghostAI.game.mapHeight;
      if (!walls.has(`${exitX},${exitY}`)) {
        exitPositions.push({ x: exitX, y: exitY });
      }
    }

    if (exitPositions.length <= 1) return [null, 0.0];

    const blockedExits = new Set();
    otherGhosts.forEach((ghost) => {
      if (ghost !== ghostAI.ghost) {
        blockedExits.add(`${ghost.targetX},${ghost.targetY}`);
      }
    });

    let targetExit = null;
    for (const exitPos of exitPositions) {
      if (!blockedExits.has(`${exitPos.x},${exitPos.y}`)) {
        targetExit = exitPos;
        break;
      }
    }

    if (!targetExit) return [null, 0.0];

    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };
    const avoidPositions = new Set();
    otherGhosts.forEach((g) => {
      if (g !== ghostAI.ghost) {
        avoidPositions.add(`${g.gridX},${g.gridY}`);
      }
    });

    const direction = bfsNextStep(
      ghostPos,
      targetExit,
      walls,
      ghostAI.game.mapWidth,
      ghostAI.game.mapHeight,
      avoidPositions
    );

    if (direction) {
      const distance = Math.sqrt(
        Math.pow(ghostPos.x - targetExit.x, 2) +
          Math.pow(ghostPos.y - targetExit.y, 2)
      );
      const strength = Math.min(1.0, 5.0 / (distance + 0.1));
      return [direction, strength * this.priority];
    }

    return [null, 0.0];
  }
}

// Basic Wander Rule (fallback)
class WanderRule extends GhostRule {
  constructor(priority = 0.5) {
    super(priority);
  }

  evaluate(ghostAI, walls, pacman, otherGhosts) {
    const validDirs = [];
    const ghostPos = { x: ghostAI.ghost.gridX, y: ghostAI.ghost.gridY };

    for (const direction of DIRECTIONS) {
      const nextX =
        (ghostPos.x + direction.x + ghostAI.game.mapWidth) %
        ghostAI.game.mapWidth;
      const nextY =
        (ghostPos.y + direction.y + ghostAI.game.mapHeight) %
        ghostAI.game.mapHeight;

      if (!walls.has(`${nextX},${nextY}`)) {
        let collision = false;
        for (const ghost of otherGhosts) {
          if (
            ghost !== ghostAI.ghost &&
            ((ghost.gridX === nextX && ghost.gridY === nextY) ||
              (ghost.targetX === nextX && ghost.targetY === nextY))
          ) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          validDirs.push(direction);
        }
      }
    }

    if (validDirs.length === 0) return [null, 0.0];

    const chosenDirection =
      validDirs[Math.floor(Math.random() * validDirs.length)];
    return [chosenDirection, this.priority];
  }
}
