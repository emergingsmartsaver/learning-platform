import { describe, it, expect, vi } from 'vitest';
import { scoreQuiz } from './quizzes';
import type { Quiz } from '../types';

// scoreQuiz is a pure function, but quizzes.ts also imports `db` from
// firebase.ts for its other (Firestore-backed) exports. Mock it so this
// test file doesn't require real Firebase env vars to run.
vi.mock('./firebase', () => ({ db: {} }));

const baseQuiz: Quiz = {
  id: 'quiz-1',
  milestoneId: 'm-1',
  careerPathId: 'cp-1',
  title: 'Test Quiz',
  passingScorePct: 80,
  questions: [
    { id: 'q1', type: 'single', prompt: 'Pick A', options: ['A', 'B'], correctAnswer: 'A' },
    { id: 'q2', type: 'single', prompt: 'Pick B', options: ['A', 'B'], correctAnswer: 'B' },
    {
      id: 'q3',
      type: 'multi',
      prompt: 'Pick A and C',
      options: ['A', 'B', 'C'],
      correctAnswer: ['A', 'C'],
    },
    { id: 'q4', type: 'text', prompt: 'Type continuous deployment', correctAnswer: 'continuous deployment' },
  ],
};

describe('scoreQuiz', () => {
  it('scores 100% and passes when every answer is correct', () => {
    const result = scoreQuiz(baseQuiz, {
      q1: 'A',
      q2: 'B',
      q3: ['A', 'C'],
      q4: 'continuous deployment',
    });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('fails when score is below passingScorePct', () => {
    // 1 correct out of 4 = 25%, below 80% passing score.
    const result = scoreQuiz(baseQuiz, { q1: 'A', q2: 'A', q3: ['B'], q4: 'wrong' });
    expect(result.score).toBe(25);
    expect(result.passed).toBe(false);
  });

  it('scores exactly at the passing threshold as a pass', () => {
    // 80% passing score with 4 questions requires all 4 correct in this
    // quiz (since 3/4 = 75% would fail) — this asserts the boundary itself.
    const result = scoreQuiz(
      { ...baseQuiz, passingScorePct: 75 },
      { q1: 'A', q2: 'B', q3: ['A', 'C'], q4: 'wrong' }
    );
    expect(result.score).toBe(75);
    expect(result.passed).toBe(true);
  });

  it('treats multi-select answers as unordered sets, not exact array order', () => {
    const result = scoreQuiz(
      { ...baseQuiz, questions: [baseQuiz.questions[2]] },
      { q3: ['C', 'A'] } // reversed order from correctAnswer ['A', 'C']
    );
    expect(result.score).toBe(100);
  });

  it('rejects a multi-select answer missing one required option', () => {
    const result = scoreQuiz(
      { ...baseQuiz, questions: [baseQuiz.questions[2]] },
      { q3: ['A'] } // missing 'C'
    );
    expect(result.score).toBe(0);
  });

  it('rejects a multi-select answer with an extra, non-required option', () => {
    const result = scoreQuiz(
      { ...baseQuiz, questions: [baseQuiz.questions[2]] },
      { q3: ['A', 'C', 'B'] } // includes an extra wrong option
    );
    expect(result.score).toBe(0);
  });

  it('scores text answers case-insensitively and trims whitespace', () => {
    const result = scoreQuiz(
      { ...baseQuiz, questions: [baseQuiz.questions[3]] },
      { q4: '  Continuous Deployment  ' }
    );
    expect(result.score).toBe(100);
  });

  it('accepts a text answer that is a substring match either direction', () => {
    const result = scoreQuiz(
      { ...baseQuiz, questions: [baseQuiz.questions[3]] },
      { q4: 'continuous deployment pipeline' } // extra words, still contains the answer
    );
    expect(result.score).toBe(100);
  });

  it('treats an unanswered question as incorrect rather than throwing', () => {
    const result = scoreQuiz(baseQuiz, { q1: 'A' }); // q2, q3, q4 left unanswered
    expect(result.score).toBe(25);
    expect(result.passed).toBe(false);
  });

  it('returns 0% for a quiz with no questions rather than dividing by zero', () => {
    const result = scoreQuiz({ ...baseQuiz, questions: [] }, {});
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});
