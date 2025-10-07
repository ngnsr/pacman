function bfsNextStep(
  startPos,
  targetPos,
  walls,
  mapWidth,
  mapHeight,
  avoidPositions = new Set()
) {
  if (startPos.x === targetPos.x && startPos.y === targetPos.y) return null;

  const queue = [{ pos: startPos, path: [] }];
  const visited = new Set();
  visited.add(`${startPos.x},${startPos.y}`);

  while (queue.length > 0) {
    const { pos, path } = queue.shift();

    for (const direction of DIRECTIONS) {
      const nextX = (pos.x + direction.x + mapWidth) % mapWidth;
      const nextY = (pos.y + direction.y + mapHeight) % mapHeight;
      const nextPos = { x: nextX, y: nextY };
      const posKey = `${nextX},${nextY}`;

      if (
        visited.has(posKey) ||
        walls.has(posKey) ||
        avoidPositions.has(posKey)
      )
        continue;

      const newPath = [...path, direction];

      if (nextX === targetPos.x && nextY === targetPos.y) {
        return newPath[0] || null;
      }

      queue.push({ pos: nextPos, path: newPath });
      visited.add(posKey);

      if (newPath.length > 15) break;
    }
  }

  return null;
}
