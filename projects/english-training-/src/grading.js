/**
 * Grading Module
 * Evaluates user answers against expected answers
 * and provides feedback, hints, and example sentences.
 */

/**
 * Grade a user answer against a question
 * @param {Object} question - The question object
 * @param {string} userAnswer - The user's response
 * @returns {Object} Grade result with score and feedback
 */
export function gradeAnswer(question, userAnswer) {
  const expectedAnswer = question.answer;
  const keywords = question.keywords;

  // Normalize the answer
  const normalizedAnswer = normalizeAnswer(userAnswer);

  // Calculate similarity score
  let score = 0;

  // Check if the answer contains the expected keywords
  for (const keyword of keywords) {
    if (normalizedAnswer.includes(keyword)) {
      score += 1;
    }
  }

  // Bonus points for correct grammar/structure (simplified)
  if (score === 0 && normalizedAnswer.length > 0 && normalizedAnswer.trim().length > 2) {
    score = 1;
  }

  // Determine grade
  let grade;
  if (score >= 2) grade = 'Excellent';
  else if (score >= 1) grade = 'Good';
  else grade = 'Needs Improvement';

  return {
    score,
    grade,
    feedback: generateFeedback(question, userAnswer, score),
    hint: generateHint(question),
    example: expectedAnswer
  };
}

/**
 * Normalize an answer by converting to lowercase and stripping extra whitespace
 */
function normalizeAnswer(answer) {
  if (!answer) return '';
  return answer.toLowerCase().trim();
}

/**
 * Generate feedback based on the answer quality
 */
function generateFeedback(question, userAnswer, score) {
  const feedback = [];

  if (score >= 2) {
    feedback.push('Great job! Your answer is correct and well-formed.');
  } else if (score >= 1) {
    feedback.push('Good effort! Your answer is almost correct.');
  } else {
    feedback.push('Try again. Think about the question and give a clearer answer.');
  }

  return feedback.join(' ');
}

/**
 * Generate a hint for a given question
 */
function generateHint(question) {
  const keywords = question.keywords;
  if (keywords && keywords.length > 0) {
    return `Hint: Try using the word "${keywords[0]}" in your answer.`;
  }
  return 'Hint: Take your time and think about the question.';
}