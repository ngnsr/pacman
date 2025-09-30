// Rule-based AI
class RuleBasedGhostAI {
  constructor(ghost, game, rules = []) {
    this.ghost = ghost;
    this.game = game;
    this.rules = rules;
  }

  getNextDirection(walls, pacman, otherGhosts) {
    const directionVotes = {};

    for (const rule of this.rules) {
      if (rule.enabled) {
        const [direction, strength] = rule.evaluate(
          this,
          walls,
          pacman,
          otherGhosts
        );
        if (direction && strength > 0) {
          const dirKey = `${direction.x},${direction.y}`;
          if (!directionVotes[dirKey]) {
            directionVotes[dirKey] = { direction, totalStrength: 0 };
          }
          directionVotes[dirKey].totalStrength += strength;
        }
      }
    }

    if (Object.keys(directionVotes).length > 0) {
      const bestVote = Object.values(directionVotes).reduce((best, current) =>
        current.totalStrength > best.totalStrength ? current : best
      );
      return bestVote.direction;
    }

    // Fallback to random movement
    const validDirs = this.getValidDirections(walls, otherGhosts);
    return validDirs.length > 0
      ? validDirs[Math.floor(Math.random() * validDirs.length)]
      : { x: 0, y: 0 };
  }

  getValidDirections(walls, otherGhosts) {
    const validDirections = [];
    const ghostPos = { x: this.ghost.gridX, y: this.ghost.gridY };

    for (const direction of DIRECTIONS) {
      const nextX =
        (ghostPos.x + direction.x + this.game.mapWidth) % this.game.mapWidth;
      const nextY =
        (ghostPos.y + direction.y + this.game.mapHeight) % this.game.mapHeight;

      if (!walls.has(`${nextX},${nextY}`)) {
        let collision = false;
        for (const ghost of otherGhosts) {
          if (
            ghost !== this.ghost &&
            ((ghost.gridX === nextX && ghost.gridY === nextY) ||
              (ghost.targetX === nextX && ghost.targetY === nextY))
          ) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          validDirections.push(direction);
        }
      }
    }

    return validDirections;
  }
}
