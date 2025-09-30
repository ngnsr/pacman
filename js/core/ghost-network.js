class GhostNetwork {
  constructor() {
    this.sharedMemory = {};
    this.communicationRange = 4;
  }

  sharePacmanSighting(ghostPos, pacmanPos, timestamp, confidence = 1.0) {
    this.sharedMemory = {
      pacmanPos,
      timestamp,
      confidence,
      reporterPos: ghostPos,
    };
  }

  getSharedPacmanInfo(ghostPos, currentTime) {
    if (!this.sharedMemory.timestamp) return [null, 0];

    const age = currentTime - this.sharedMemory.timestamp;
    if (age > 3000) return [null, 0]; // 3 seconds

    const reporterPos = this.sharedMemory.reporterPos || { x: 0, y: 0 };
    const distance = Math.sqrt(
      Math.pow(ghostPos.x - reporterPos.x, 2) +
        Math.pow(ghostPos.y - reporterPos.y, 2)
    );

    if (distance > this.communicationRange) return [null, 0];

    const confidence =
      this.sharedMemory.confidence *
      (1 - age / 3000) *
      (1 - distance / this.communicationRange);

    return [this.sharedMemory.pacmanPos, Math.max(0, confidence)];
  }
}

const ghostNetwork = new GhostNetwork();
