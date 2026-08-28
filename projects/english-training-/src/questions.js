/**
 * Question Generator
 * Simulates AI-generated questions for English training
 * In production, could connect to OpenRouter API for real AI generation
 */

// Situations and their questions
const questionBank = [
  {
    situation: 'Daily Life',
    questions: [
      { question: 'What do you usually have for breakfast?', answer: 'I have toast and coffee.', keywords: ['toast', 'coffee', 'bread', 'eggs'] },
      { question: 'What time do you usually wake up?', answer: 'I wake up at seven.', keywords: ['seven', '6', 'morning', 'wake'] },
      { question: 'How do you get to work or school?', answer: 'I take the train.', keywords: ['train', 'bus', 'car', 'walk', 'bike'] },
      { question: 'What did you do yesterday evening?', answer: 'I watched a movie.', keywords: ['watched', 'movie', 'read', 'dinner', 'walk'] },
      { question: 'What is your favorite day of the week?', answer: 'My favorite day is Saturday.', keywords: ['Saturday', 'Friday', 'weekend', 'Friday'] },
    ]
  },
  {
    situation: 'Shopping',
    questions: [
      { question: 'How much is this shirt?', answer: 'It is twenty dollars.', keywords: ['dollars', 'twenty', 'yen', 'cheap', 'expensive'] },
      { question: 'Do you have this in a smaller size?', answer: 'I will check the back.', keywords: ['check', 'size', 'smaller', 'larger', 'back'] },
      { question: 'Where can I find the vegetables?', answer: 'They are in aisle three.', keywords: ['aisle', 'vegetables', 'fresh', 'left', 'right'] },
      { question: 'Can I pay by credit card?', answer: 'Yes, we accept all cards.', keywords: ['card', 'cash', 'accept', 'yes', 'pay'] },
      { question: 'Do you have a bag?', answer: 'Here is a plastic bag.', keywords: ['bag', 'plastic', 'paper', 'here'] },
    ]
  },
  {
    situation: 'Restaurant',
    questions: [
      { question: 'May I see the menu, please?', answer: 'Here you are.', keywords: ['here', 'menu', 'please', 'moment'] },
      { question: 'What do you recommend?', answer: 'The pasta is delicious.', keywords: ['pasta', 'recommend', 'steak', 'fish', 'delicious'] },
      { question: 'I would like to make a reservation.', answer: 'For how many people?', keywords: ['people', 'reservation', 'how many', 'when'] },
      { question: 'Could I have the bill, please?', answer: 'Here is your check.', keywords: ['check', 'bill', 'cash', 'card', 'total'] },
      { question: 'Is this seat taken?', answer: 'No, please sit down.', keywords: ['sit', 'taken', 'yes', 'no', 'free'] },
    ]
  },
  {
    situation: 'Travel',
    questions: [
      { question: 'Where is the train station?', answer: 'Go straight and turn left.', keywords: ['station', 'left', 'straight', 'right', 'near'] },
      { question: 'How much is a ticket to Tokyo?', answer: 'It is fifteen thousand yen.', keywords: ['thousand', 'yen', 'ticket', 'fifteen'] },
      { question: 'When does the next train leave?', answer: 'It leaves at five.', keywords: ['leaves', 'five', 'next', 'ten', 'minutes'] },
      { question: 'Is this seat near the window?', answer: 'Yes, it is a window seat.', keywords: ['window', 'aisle', 'seat', 'yes', 'middle'] },
      { question: 'How long does it take to Osaka?', answer: 'It takes about two hours.', keywords: ['hours', 'takes', 'two', 'minutes', 'long'] },
    ]
  },
  {
    situation: 'Weather',
    questions: [
      { question: 'What is the weather like today?', answer: 'It is sunny and warm.', keywords: ['sunny', 'rainy', 'warm', 'cold', 'cloudy'] },
      { question: 'Should I bring an umbrella?', answer: 'Yes, it might rain.', keywords: ['rain', 'umbrella', 'yes', 'maybe', 'should'] },
      { question: 'What was the temperature yesterday?', answer: 'It was about twenty degrees.', keywords: ['degrees', 'twenty', 'yesterday', 'warm', 'cold'] },
      { question: 'Is it going to snow this weekend?', answer: 'No, it will be clear.', keywords: ['snow', 'clear', 'weekend', 'no', 'yes'] },
      { question: 'What is the forecast for tomorrow?', answer: 'It will be cloudy in the morning.', keywords: ['cloudy', 'forecast', 'morning', 'rain', 'sunny'] },
    ]
  },
  {
    situation: 'Work',
    questions: [
      { question: 'What do you do for a living?', answer: 'I work as a teacher.', keywords: ['teacher', 'work', 'engineer', 'doctor', 'business'] },
      { question: 'Where do you work?', answer: 'I work in an office.', keywords: ['office', 'home', 'company', 'Tokyo', 'store'] },
      { question: 'What time do you finish work?', answer: 'I finish at six.', keywords: ['six', 'finish', 'five', 'evening', 'work'] },
      { question: 'Do you enjoy your job?', answer: 'Yes, I really like it.', keywords: ['like', 'enjoy', 'yes', 'love', 'interesting'] },
      { question: 'How is your project going?', answer: 'It is making good progress.', keywords: ['progress', 'good', 'slowly', 'great', 'project'] },
    ]
  },
  {
    situation: 'Hobbies',
    questions: [
      { question: 'What do you do in your free time?', answer: 'I like to read books.', keywords: ['read', 'books', 'watch', 'movies', 'play'] },
      { question: 'Do you play any sports?', answer: 'Yes, I play tennis.', keywords: ['tennis', 'soccer', 'sports', 'swim', 'gym'] },
      { question: 'Have you traveled to any foreign countries?', answer: 'I have been to France.', keywords: ['France', 'America', 'traveled', 'visited', 'countries'] },
      { question: 'What kind of music do you like?', answer: 'I enjoy listening to jazz.', keywords: ['jazz', 'pop', 'rock', 'classical', 'music'] },
      { question: 'Do you have any pets?', answer: 'Yes, I have a dog.', keywords: ['dog', 'cat', 'pet', 'have', 'bird'] },
    ]
  },
  {
    situation: 'Health',
    questions: [
      { question: 'How are you feeling today?', answer: 'I am feeling much better.', keywords: ['better', 'good', 'tired', 'sick', 'fine'] },
      { question: 'Did you sleep well last night?', answer: 'Yes, I slept eight hours.', keywords: ['slept', 'hours', 'well', 'last', 'night'] },
      { question: 'Are you taking any medicine?', answer: 'Yes, twice a day.', keywords: ['medicine', 'twice', 'day', 'yes', 'every'] },
      { question: 'Do you exercise regularly?', answer: 'Yes, I go to the gym.', keywords: ['gym', 'exercise', 'run', 'walk', 'yes'] },
      { question: 'How is your headache?', answer: 'It is getting better now.', keywords: ['better', 'headache', 'worse', 'still', 'gone'] },
    ]
  }
];

/**
 * Generate a random set of questions for a training session
 * @param {number} count - Number of questions to generate (default 10)
 * @returns {Array} Array of question objects
 */
export function generateSessionQuestions(count = 10) {
  const allQuestions = [];
  
  // Shuffle the question bank
  const shuffledSituations = [...questionBank].sort(() => Math.random() - 0.5);
  
  // Select questions from different situations
  let questionCount = 0;
  let situationIndex = 0;
  
  while (questionCount < count) {
    const situation = shuffledSituations[situationIndex % shuffledSituations.length];
    const shuffledQuestions = [...situation.questions].sort(() => Math.random() - 0.5);
    
    for (const q of shuffledQuestions) {
      if (questionCount >= count) break;
      allQuestions.push({
        id: questionCount + 1,
        situation: situation.situation,
        question: q.question,
        answer: q.answer,
        keywords: q.keywords
      });
      questionCount++;
    }
    situationIndex++;
  }
  
  return allQuestions;
}

/**
 * Get all available situations
 * @returns {Array} Array of situation names
 */
export function getSituations() {
  return questionBank.map(s => s.situation);
}
