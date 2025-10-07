class MapLoader {
  loadMap(mapData) {
    const walls = new Set();
    const dots = new Set();
    const ghostStarts = [];
    let pacmanStart = null;

    for (let y = 0; y < mapData.length; y++) {
      const line = mapData[y];
      for (let x = 0; x < line.length; x++) {
        const char = line[x];
        if (char === "#") {
          walls.add(`${x},${y}`);
        } else if (char === ".") {
          dots.add(`${x},${y}`);
        } else if (char === "P") {
          pacmanStart = {
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: y * CELL_SIZE + CELL_SIZE / 2,
          };
        } else if (char === "G") {
          ghostStarts.push({
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: y * CELL_SIZE + CELL_SIZE / 2,
          });
        }
      }
    }

    if (!pacmanStart) {
      throw new Error("Pacman start position (P) not found in map!");
    }

    if (ghostStarts.length === 0) {
      throw new Error("Ghost start positions (G) not found in map!");
    }

    return {
      walls,
      dots,
      pacmanStart,
      ghostStarts,
    };
  }
}
