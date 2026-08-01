/**
 * Scheduler V2-B 骨架测试
 */
import { describe, it, expect } from "vitest";
import {
  runScheduler,
  TIERS,
  MAX_ROUNDS,
  SCHEDULER_STATUS,
  checkGoalReached,
  checkFixedPoint,
  checkMaxRounds,
  checkDegenerateLoop,
  checkAllRulesExhausted,
} from "./scheduler.js";

function createMockFactRegistry(initial = []) {
  const facts = initial.map((f, i) => ({
    id: f.id || `f${i}`,
    type: f.type || f.predicate || "predicate",
    predicate: f.predicate || f.type || "predicate",
    args: f.args || f.subjects || [],
    subjects: f.subjects || f.args || [],
    sources: f.sources || [],
  }));
  const keyOf = (f) =>
    f.id ||
    `${f.type || f.predicate}|${(f.args || f.subjects || []).join(",")}`;

  return {
    getAllFacts: () => [...facts],
    size: () => facts.length,
    hasFact: (id) => facts.some((f) => f.id === id),
    addFact: (fact) => {
      const key = keyOf(fact);
      const existing = facts.find((f) => keyOf(f) === key);
      if (existing) {
        if (fact.sources) {
          for (const s of fact.sources) {
            if (!existing.sources.includes(s)) existing.sources.push(s);
          }
        }
        return existing;
      }
      const stored = {
        id: fact.id || key,
        type: fact.type || fact.predicate,
        predicate: fact.predicate || fact.type,
        args: fact.args || fact.subjects || [],
        subjects: fact.subjects || fact.args || [],
        sources: fact.sources ? [...fact.sources] : [],
      };
      facts.push(stored);
      return stored;
    },
  };
}

function createMockRuleRegistry(rules = []) {
  return {
    getAllRules: () => [...rules],
    getRulesByTier: (tier) => rules.filter((r) => r.tier === tier),
    size: () => rules.length,
  };
}

describe("Scheduler V2-B skeleton", () => {
  it("exposes fixed string TIERS", () => {
    expect(TIERS).toEqual([
      "axiom",
      "definition",
      "theorem",
      "corollary",
      "lemma",
      "heuristic",
      "meta",
    ]);
    expect(MAX_ROUNDS).toBe(15);
  });

  describe("Case 1: empty rules → FIXED_POINT", () => {
    it("facts=[] rules=[] → status FIXED_POINT", () => {
      const factRegistry = createMockFactRegistry([]);
      const ruleRegistry = createMockRuleRegistry([]);

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager: null,
        goal: null,
      });

      expect(result.status).toBe(SCHEDULER_STATUS.FIXED_POINT);
      expect(result.rounds).toBe(0);
      expect(result.facts).toEqual([]);
      expect(result.proofSteps).toEqual([]);
      expect(result.constructions).toEqual([]);
    });
  });

  describe("Case 2: single rule produces fact", () => {
    it("rounds increase and fact count increases", () => {
      const factRegistry = createMockFactRegistry([
        {
          id: "seed",
          type: "point",
          predicate: "point",
          args: ["A"],
        },
      ]);

      const ruleRegistry = createMockRuleRegistry([
        {
          id: "r1",
          tier: "axiom",
          salience: 10,
          condition: ({ facts }) => facts.some((f) => f.id === "seed"),
          apply: () => ({
            facts: [
              {
                id: "derived",
                type: "line",
                predicate: "line",
                args: ["A", "B"],
              },
            ],
            proofSteps: [
              {
                step: 1,
                title: "由结构推出线段",
                content: "由点 A 构造线段 AB",
                formula: "",
              },
            ],
          }),
        },
      ]);

      const before = factRegistry.size();
      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager: null,
        goal: null,
      });

      expect(result.rounds).toBeGreaterThanOrEqual(1);
      expect(result.facts.length).toBeGreaterThan(before);
      expect(result.facts.some((f) => f.id === "derived")).toBe(true);
      // 该 mock 规则无 already 守卫、条件恒真且反复产出同一事实，
      // 语义上属于规则空转 → DEGENERATE_LOOP（而非干净收敛的 FIXED_POINT）
      expect(result.status).toBe(SCHEDULER_STATUS.DEGENERATE_LOOP);
      expect(result.proofSteps[0]).toMatchObject({
        step: 1,
        title: "由结构推出线段",
        content: "由点 A 构造线段 AB",
        formula: "",
      });
    });
  });

  describe("Case 3: MAX_ROUNDS", () => {
    it("infinite produce → status MAX_ROUNDS", () => {
      let counter = 0;
      const factRegistry = createMockFactRegistry([
        { id: "seed", type: "predicate", predicate: "seed", args: [] },
      ]);

      const ruleRegistry = createMockRuleRegistry([
        {
          id: "infinite",
          tier: "heuristic",
          salience: 1,
          condition: () => true,
          apply: () => {
            counter += 1;
            return {
              facts: [
                {
                  id: `n${counter}`,
                  type: "predicate",
                  predicate: "n",
                  args: [String(counter)],
                },
              ],
            };
          },
        },
      ]);

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager: null,
        goal: null,
        maxRounds: MAX_ROUNDS,
      });

      expect(result.status).toBe(SCHEDULER_STATUS.MAX_ROUNDS);
      expect(result.rounds).toBe(MAX_ROUNDS);
      expect(result.facts.length).toBeGreaterThan(1);
    });
  });

  describe("stop condition interfaces", () => {
    it("checkGoalReached / checkFixedPoint / checkMaxRounds / checkDegenerateLoop / checkAllRulesExhausted", () => {
      const factRegistry = createMockFactRegistry([
        { id: "g1", type: "predicate", predicate: "goal", args: [] },
      ]);
      const emptyRules = createMockRuleRegistry([]);

      expect(
        checkGoalReached({
          goal: "g1",
          factRegistry,
        })
      ).toBe(true);

      expect(checkFixedPoint({ factsAddedThisRound: 0 })).toBe(true);
      expect(checkFixedPoint({ factsAddedThisRound: 2 })).toBe(false);

      expect(checkMaxRounds({ rounds: 15, maxRounds: 15 })).toBe(true);
      expect(checkMaxRounds({ rounds: 3, maxRounds: 15 })).toBe(false);

      expect(
        checkDegenerateLoop({
          factsAddedThisRound: 0,
          fingerprintHistory: ["a", "a"],
        })
      ).toBe(true);

      expect(checkAllRulesExhausted({ ruleRegistry: emptyRules })).toBe(true);
    });
  });

  describe("Tier order is fixed", () => {
    it("executes rules in tier axiom → theorem → heuristic order", () => {
      const order = [];
      const factRegistry = createMockFactRegistry([
        { id: "seed", type: "predicate", predicate: "seed", args: [] },
      ]);
      const ruleRegistry = createMockRuleRegistry([
        {
          id: "t_heuristic",
          tier: "heuristic",
          salience: 1,
          condition: () => true,
          apply: () => {
            order.push("heuristic");
            return { facts: [] };
          },
        },
        {
          id: "t_axiom",
          tier: "axiom",
          salience: 1,
          condition: () => true,
          apply: () => {
            order.push("axiom");
            return { facts: [] };
          },
        },
        {
          id: "t_theorem",
          tier: "theorem",
          salience: 1,
          condition: () => true,
          apply: () => {
            order.push("theorem");
            return { facts: [] };
          },
        },
      ]);

      runScheduler({ factRegistry, ruleRegistry, goal: null });
      expect(order).toEqual(["axiom", "theorem", "heuristic"]);
    });
  });
});
