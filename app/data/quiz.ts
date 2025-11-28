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
    question: "What is the primary diet of the Kraken?",
    options: [
      { id: "q0-a", text: "Ships and Sailors" },
      { id: "q0-b", text: "Plankton" },
      { id: "q0-c", text: "Whales" },
      { id: "q0-d", text: "Gold Doubloons" },
    ],
    correctAnswer: "q0-a",
  },
  {
    question: "Which direction is 'Starboard'?",
    options: [
      { id: "q1-a", text: "Left" },
      { id: "q1-b", text: "Right" },
      { id: "q1-c", text: "Forward" },
      { id: "q1-d", text: "Backward" },
    ],
    correctAnswer: "q1-b",
  },
  {
    question: "What is a 'Jolly Roger'?",
    options: [
      { id: "q2-a", text: "A happy sailor" },
      { id: "q2-b", text: "A pirate flag" },
      { id: "q2-c", text: "A tavern drink" },
      { id: "q2-d", text: "A type of knot" },
    ],
    correctAnswer: "q2-b",
  },
  {
    question: "What does 'Davy Jones' Locker' refer to?",
    options: [
      { id: "q3-a", text: "A treasure chest" },
      { id: "q3-b", text: "The bottom of the sea" },
      { id: "q3-c", text: "A captain's cabin" },
      { id: "q3-d", text: "A prison cell" },
    ],
    correctAnswer: "q3-b",
  },
  {
    question: "Which of these is NOT a type of ship?",
    options: [
      { id: "q4-a", text: "Sloop" },
      { id: "q4-b", text: "Galleon" },
      { id: "q4-c", text: "Frigate" },
      { id: "q4-d", text: "Cutlass" },
    ],
    correctAnswer: "q4-d",
  },
  {
    question: "What is 'Grog'?",
    options: [
      { id: "q5-a", text: "Rotten food" },
      { id: "q5-b", text: "Diluted rum" },
      { id: "q5-c", text: "Sea water" },
      { id: "q5-d", text: "A sea monster" },
    ],
    correctAnswer: "q5-b",
  },
  {
    question: "Who is the captain of the Flying Dutchman?",
    options: [
      { id: "q6-a", text: "Blackbeard" },
      { id: "q6-b", text: "Davy Jones" },
      { id: "q6-c", text: "Captain Hook" },
      { id: "q6-d", text: "Jack Sparrow" },
    ],
    correctAnswer: "q6-b",
  },
  {
    question: "What is the 'Crow's Nest'?",
    options: [
      { id: "q7-a", text: "A bird's home" },
      { id: "q7-b", text: "A lookout platform" },
      { id: "q7-c", text: "The kitchen" },
      { id: "q7-d", text: "The captain's hat" },
    ],
    correctAnswer: "q7-b",
  },
  {
    question: "What does 'Shiver me timbers' mean?",
    options: [
      { id: "q8-a", text: "I'm cold" },
      { id: "q8-b", text: "The ship is breaking" },
      { id: "q8-c", text: "An expression of shock" },
      { id: "q8-d", text: "Chop the wood" },
    ],
    correctAnswer: "q8-c",
  },
  {
    question: "What is 'Keelhauling'?",
    options: [
      { id: "q9-a", text: "Repairing the keel" },
      { id: "q9-b", text: "A punishment" },
      { id: "q9-c", text: "Cooking fish" },
      { id: "q9-d", text: "Sailing fast" },
    ],
    correctAnswer: "q9-b",
  },
];
