import { describe, it, expect } from "vitest";
import { EnglishTrainingApp } from "../src/main.js";

describe("EnglishTrainingApp", () => {
  it("starts a session", () => {
    const app = new EnglishTrainingApp();
    app.startSession();
    expect(app.sessionStarted).toBe(true);
    expect(app.sessionQuestions.length).toBe(10);
    expect(app.currentIndex).toBe(0);
  });

  it("submitAnswer returns result", () => {
    const app = new EnglishTrainingApp();
    app.startSession();
    const question = app.getCurrentQuestion();
    const result = app.submitAnswer("Test answer");
    expect(result).toBeDefined();
    expect(result.score).not.toBeUndefined();
    expect(result.grade).toBeDefined();
  });

  it("isComplete returns false during session", () => {
    const app = new EnglishTrainingApp();
    app.startSession();
    expect(app.isComplete()).toBe(false);
  });

  it("isComplete returns true after session", () => {
    const app = new EnglishTrainingApp();
    app.startSession();
    for (let i = 0; i < 10; i++) {
      app.submitAnswer("Test");
    }
    expect(app.isComplete()).toBe(true);
  });

  it("getResults returns session stats", () => {
    const app = new EnglishTrainingApp();
    app.startSession();
    const results = app.getResults();
    expect(results.totalQuestions).toBe(10);
    expect(results.completed).toBe(0);
    expect(results.percentage).not.toBeUndefined();
  });
});
