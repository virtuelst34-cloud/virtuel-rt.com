import { describe, it, expect } from 'vitest';
import { quizService } from '@/lib/quiz';

describe('quizService', () => {
  it('createPresetQuiz crée un quiz avec questions', () => {
    const quiz = quizService.createPresetQuiz('quiz', 'TestUser', 'general');
    expect(quiz.salonId).toBe('quiz');
    expect(quiz.questions.length).toBeGreaterThan(0);
    expect(quiz.isActive).toBe(false);
  });

  it('startQuiz active le quiz', () => {
    const quiz = quizService.createPresetQuiz('quiz', 'TestUser', 'tech');
    const started = quizService.startQuiz(quiz.id);
    expect(started?.isActive).toBe(true);
    expect(started?.startedAt).toBeDefined();
  });

  it('submitAnswer attribue des points si correct', () => {
    const quiz = quizService.createPresetQuiz('quiz', 'Player', 'general');
    quizService.startQuiz(quiz.id);
    const q = quizService.getCurrentQuestion(quiz.id)!;
    const result = quizService.submitAnswer(quiz.id, 'Player', 'Player', q.id, q.correctAnswer);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsEarned).toBeGreaterThan(0);
  });

  it('submitAnswer refuse une double réponse', () => {
    const quiz = quizService.createPresetQuiz('quiz', 'Player', 'general');
    quizService.startQuiz(quiz.id);
    const q = quizService.getCurrentQuestion(quiz.id)!;
    quizService.submitAnswer(quiz.id, 'Player', 'Player', q.id, q.correctAnswer);
    const again = quizService.submitAnswer(quiz.id, 'Player', 'Player', q.id, 0);
    expect(again.alreadyAnswered).toBe(true);
  });

  it('endQuiz retourne un gagnant', () => {
    const quiz = quizService.createPresetQuiz('quiz', 'Winner', 'culture');
    quizService.startQuiz(quiz.id);
    const q = quizService.getCurrentQuestion(quiz.id)!;
    quizService.submitAnswer(quiz.id, 'Winner', 'Winner', q.id, q.correctAnswer);
    const result = quizService.endQuiz(quiz.id);
    expect(result?.winner?.userName).toBe('Winner');
  });
});
