// Difficulty Level
class DifficultyLevel {
  constructor(name, description, ruleSets) {
    this.name = name;
    this.description = description;
    this.ruleSets = ruleSets;
  }
}

// Difficulty Manager
class DifficultyManager {
  constructor() {
    this.currentLevel = 0;
    this.levels = this.createDifficultyLevels();
  }

  createDifficultyLevels() {
    return [
      new DifficultyLevel("Beginner", "Short sight, no memory, simple patrol", [
        [
          new EnhancedVisionRule(2, 1, 500, 2.0),
          new IntelligentWanderRule(1.2),
          new AvoidOtherGhostsRule(3, 1.0),
        ],
        [
          new SmartPatrolRule(
            [
              { x: 5, y: 5 },
              { x: 18, y: 5 },
              { x: 18, y: 15 },
              { x: 5, y: 15 },
            ],
            1.5
          ),
          new IntelligentWanderRule(1.0),
          new AvoidOtherGhostsRule(3, 1.0),
        ],
        [new IntelligentWanderRule(1.5), new AvoidOtherGhostsRule(2, 0.8)],
        [new WanderRule(1.0)],
      ]),
      new DifficultyLevel(
        "Intermediate",
        "Medium sight, short memory, sound detection",
        [
          [
            new EnhancedVisionRule(4, 2, 1500, 3.0),
            new IntelligentWanderRule(1.0),
            new AvoidOtherGhostsRule(2, 1.2),
          ],
          [
            new SmartPatrolRule(
              [
                { x: 3, y: 3 },
                { x: 20, y: 3 },
                { x: 20, y: 16 },
                { x: 3, y: 16 },
              ],
              2.0
            ),
            new EnhancedVisionRule(3, 2, 1000, 2.5),
            new IntelligentWanderRule(1.0),
            new AvoidOtherGhostsRule(2, 1.2),
          ],
          [
            new EnhancedVisionRule(3, 1, 1000, 2.0),
            new IntelligentWanderRule(1.2),
            new AvoidOtherGhostsRule(2, 1.0),
          ],
          [
            new IntelligentWanderRule(1.2),
            new EnhancedVisionRule(2, 1, 500, 1.5),
            new AvoidOtherGhostsRule(3, 0.8),
          ],
        ]
      ),
      new DifficultyLevel(
        "Advanced",
        "Good sight, memory, basic coordination, prediction",
        [
          [
            new EnhancedVisionRule(6, 3, 3000, 3.5),
            new PredictPacmanRule(2, 2.5),
            new IntelligentWanderRule(1.0),
            new AvoidOtherGhostsRule(1, 0.75),
          ],
          [
            new EnhancedVisionRule(5, 2, 2500, 3.0),
            new FlankPacmanRule(2.8),
            new SmartPatrolRule(
              [
                { x: 2, y: 2 },
                { x: 21, y: 2 },
                { x: 21, y: 17 },
                { x: 2, y: 17 },
              ],
              1.5
            ),
            new IntelligentWanderRule(1.0),
            new AvoidOtherGhostsRule(1, 0.6),
          ],
          [
            new EnhancedVisionRule(5, 2, 2000, 2.8),
            new BlockEscapeRoute(2.5),
            new IntelligentWanderRule(1.0),
            new AvoidOtherGhostsRule(1, 0.5),
          ],
          [
            new EnhancedVisionRule(4, 2, 2000, 2.5),
            new PredictPacmanRule(1, 2.0),
            new SmartPatrolRule(
              [
                { x: 12, y: 6 },
                { x: 12, y: 12 },
              ],
              1.8
            ),
            new IntelligentWanderRule(1.0),
          ],
        ]
      ),
      new DifficultyLevel(
        "Expert",
        "Excellent sight, long memory, full coordination, advanced tactics",
        [
          [
            new EnhancedVisionRule(8, 4, 5000, 4.0),
            new PredictPacmanRule(3, 3.5),
            new FlankPacmanRule(3.0),
            new BlockEscapeRoute(2.5),
            new IntelligentWanderRule(1.0),
          ],
          [
            new EnhancedVisionRule(7, 5, 4500, 3.8),
            new FlankPacmanRule(3.5),
            new BlockEscapeRoute(3.2),
            new PredictPacmanRule(2, 2.8),
            new IntelligentWanderRule(1.0),
          ],
          [
            new EnhancedVisionRule(7, 4, 4000, 3.5),
            new BlockEscapeRoute(3.8),
            new PredictPacmanRule(4, 3.0),
            new FlankPacmanRule(2.5),
            new IntelligentWanderRule(1.0),
          ],
          [
            new EnhancedVisionRule(6, 3, 3500, 3.2),
            new PredictPacmanRule(3, 3.0),
            new FlankPacmanRule(2.8),
            new BlockEscapeRoute(2.5),
            new SmartPatrolRule(
              [
                { x: 12, y: 6 },
                { x: 12, y: 12 },
                { x: 6, y: 9 },
                { x: 18, y: 9 },
              ],
              2.0
            ),
            new IntelligentWanderRule(1.0),
          ],
        ]
      ),
    ];
  }

  getCurrentLevel() {
    return this.levels[this.currentLevel];
  }

  nextLevel() {
    if (this.currentLevel < this.levels.length - 1) {
      this.currentLevel++;
      return true;
    }
    return false;
  }

  prevLevel() {
    if (this.currentLevel > 0) {
      this.currentLevel--;
      return true;
    }
    return false;
  }

  setLevel(levelIndex) {
    if (levelIndex >= 0 && levelIndex < this.levels.length) {
      this.currentLevel = levelIndex;
      return true;
    }
    return false;
  }

  createGhostAIs(ghosts, game) {
    const currentLevel = this.getCurrentLevel();
    const ghostAIs = [];

    for (let i = 0; i < ghosts.length; i++) {
      const ghost = ghosts[i];
      if (i < currentLevel.ruleSets.length) {
        const rules = currentLevel.ruleSets[i];
        const ghostAI = new RuleBasedGhostAI(ghost, game, rules);
        ghostAIs.push(ghostAI);
      } else {
        const basicRules = [new IntelligentWanderRule(1.0)];
        const ghostAI = new RuleBasedGhostAI(ghost, game, basicRules);
        ghostAIs.push(ghostAI);
      }
    }

    return ghostAIs;
  }

  getActiveRulesDescription() {
    const currentLevel = this.getCurrentLevel();
    const ruleNames = new Set();

    currentLevel.ruleSets.forEach((ruleSet) => {
      ruleSet.forEach((rule) => {
        ruleNames.add(rule.constructor.name);
      });
    });

    const ruleDescriptions = {
      EnhancedVisionRule: "Limited sight & memory",
      PredictPacmanRule: "Movement prediction",
      FlankPacmanRule: "Flanking maneuvers",
      AvoidOtherGhostsRule: "Ghost separation",
      SmartPatrolRule: "Adaptive patrol",
      BlockEscapeRoute: "Exit blocking",
      IntelligentWanderRule: "Smart exploration",
      WanderRule: "Random movement",
    };

    const descriptions = [];
    ruleNames.forEach((ruleName) => {
      if (ruleDescriptions[ruleName]) {
        descriptions.push(ruleDescriptions[ruleName]);
      }
    });

    return descriptions.join(", ");
  }
}
