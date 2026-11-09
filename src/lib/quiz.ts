export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  citation: string;
};

export type QuizAttemptAnswer = {
  questionId: string;
  prompt: string;
  selectedOptionIndex: number;
  correctOptionIndex: number;
  citation: string;
};

export type QuizAttempt = {
  id: string;
  topic: string;
  completedAt: string;
  correctCount: number;
  questionCount: number;
  answers: QuizAttemptAnswer[];
};
