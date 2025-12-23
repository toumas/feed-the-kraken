export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  question: string;
  options: QuizOption[];
  correctAnswer: string; // ID of the correct option
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "quiz.q0_question",
    options: [
      { id: "q0-a", text: "quiz.q0_a" },
      { id: "q0-b", text: "quiz.q0_b" },
      { id: "q0-c", text: "quiz.q0_c" },
      { id: "q0-d", text: "quiz.q0_d" },
    ],
    correctAnswer: "q0-a",
  },
  {
    question: "quiz.q1_question",
    options: [
      { id: "q1-a", text: "quiz.q1_a" },
      { id: "q1-b", text: "quiz.q1_b" },
      { id: "q1-c", text: "quiz.q1_c" },
      { id: "q1-d", text: "quiz.q1_d" },
    ],
    correctAnswer: "q1-b",
  },
  {
    question: "quiz.q2_question",
    options: [
      { id: "q2-a", text: "quiz.q2_a" },
      { id: "q2-b", text: "quiz.q2_b" },
      { id: "q2-c", text: "quiz.q2_c" },
      { id: "q2-d", text: "quiz.q2_d" },
    ],
    correctAnswer: "q2-b",
  },
  {
    question: "quiz.q3_question",
    options: [
      { id: "q3-a", text: "quiz.q3_a" },
      { id: "q3-b", text: "quiz.q3_b" },
      { id: "q3-c", text: "quiz.q3_c" },
      { id: "q3-d", text: "quiz.q3_d" },
    ],
    correctAnswer: "q3-b",
  },
  {
    question: "quiz.q4_question",
    options: [
      { id: "q4-a", text: "quiz.q4_a" },
      { id: "q4-b", text: "quiz.q4_b" },
      { id: "q4-c", text: "quiz.q4_c" },
      { id: "q4-d", text: "quiz.q4_d" },
    ],
    correctAnswer: "q4-d",
  },
  {
    question: "quiz.q5_question",
    options: [
      { id: "q5-a", text: "quiz.q5_a" },
      { id: "q5-b", text: "quiz.q5_b" },
      { id: "q5-c", text: "quiz.q5_c" },
      { id: "q5-d", text: "quiz.q5_d" },
    ],
    correctAnswer: "q5-b",
  },
  {
    question: "quiz.q6_question",
    options: [
      { id: "q6-a", text: "quiz.q6_a" },
      { id: "q6-b", text: "quiz.q6_b" },
      { id: "q6-c", text: "quiz.q6_c" },
      { id: "q6-d", text: "quiz.q6_d" },
    ],
    correctAnswer: "q6-b",
  },
  {
    question: "quiz.q7_question",
    options: [
      { id: "q7-a", text: "quiz.q7_a" },
      { id: "q7-b", text: "quiz.q7_b" },
      { id: "q7-c", text: "quiz.q7_c" },
      { id: "q7-d", text: "quiz.q7_d" },
    ],
    correctAnswer: "q7-b",
  },
  {
    question: "quiz.q8_question",
    options: [
      { id: "q8-a", text: "quiz.q8_a" },
      { id: "q8-b", text: "quiz.q8_b" },
      { id: "q8-c", text: "quiz.q8_c" },
      { id: "q8-d", text: "quiz.q8_d" },
    ],
    correctAnswer: "q8-c",
  },
  {
    question: "quiz.q9_question",
    options: [
      { id: "q9-a", text: "quiz.q9_a" },
      { id: "q9-b", text: "quiz.q9_b" },
      { id: "q9-c", text: "quiz.q9_c" },
      { id: "q9-d", text: "quiz.q9_d" },
    ],
    correctAnswer: "q9-b",
  },
];
