import crypto from 'node:crypto';

const starterChallenges = [
  {
    title: 'Solve a 3×3 Rubik\'s Cube', category: 'Logic', level: 'Intermediate', duration: '7 days',
    description: 'Learn the cube one layer at a time. Every step has a clear goal and a clear way to show it.',
    steps: [
      { title: 'Solve one face', instruction: 'Finish one face so that all nine stickers are the same color.', proof: 'A photo of all six sides, or a short video of the result.' },
      { title: 'Solve two layers', instruction: 'Show the first two layers fully solved.', proof: 'A video showing both layers from several angles.' },
      { title: 'Solve the full cube', instruction: 'Scramble the cube, then solve it start to finish.', proof: 'An uncut video of the whole solve.' }
    ]
  },
  {
    title: 'Brew a cup of manual-brew coffee', category: 'Life', level: 'Beginner', duration: '3 days',
    description: 'From weighing the beans to the final pour, and a cup you can describe in your own words.',
    steps: [
      { title: 'Set your ratio', instruction: 'Decide on a coffee-to-water ratio and write it down.', proof: 'A photo of your gear, the coffee, and your notes.' },
      { title: 'Brew and evaluate', instruction: 'Brew the coffee, then write down one thing you would change.', proof: 'A photo or video of the brew, plus tasting notes.' }
    ]
  },
  {
    title: 'Introduce yourself in 60 seconds', category: 'Communication', level: 'Beginner', duration: '2 days',
    description: 'Practice a clear, natural introduction without reading from a script.',
    steps: [
      { title: 'Outline three points', instruction: 'Pick who you are, what you enjoy, and what you want to achieve.', proof: 'A photo of your three-point outline.' },
      { title: 'Record it', instruction: 'Speak for 45–75 seconds without reading from a script.', proof: 'A single-take video of your introduction.' }
    ]
  },
  {
    title: 'Sew on a loose button', category: 'Life', level: 'Beginner', duration: '1 day',
    description: 'A small skill that pays off for life: reattach a button so it stays on.',
    steps: [{ title: 'Attach the button', instruction: 'Sew a button onto fabric until it is firm and neat.', proof: 'Before and after photos, or a video of the process.' }]
  },
  {
    title: 'Sketch an object near you', category: 'Creative', level: 'Beginner', duration: '3 days',
    description: 'See an ordinary object in a new way through line, shape, and shadow.',
    steps: [
      { title: 'Draw the outline', instruction: 'Choose one object and draw its basic shape.', proof: 'A photo of the object next to your early sketch.' },
      { title: 'Add shading', instruction: 'Add at least three tones from light to dark.', proof: 'A photo of the object next to your finished sketch.' }
    ]
  },
  {
    title: 'Sign language: basic greetings', category: 'Communication', level: 'Beginner', duration: '2 days',
    description: 'Start learning a few basic greetings from a reliable reference.',
    steps: [{ title: 'Learn three greetings', instruction: 'Learn and practice three greetings from a trusted sign language source.', proof: 'A practice video and a link to the learning resource you used.' }]
  }
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

export function createSeed() {
  const now = new Date().toISOString();
  return {
    users: [
      { id: 'demo-user', name: 'Alya Learner', email: 'learner@demo.test', password: hashPassword('learner123'), role: 'user', createdAt: now },
      { id: 'demo-reviewer', name: 'Raka Reviewer', email: 'reviewer@demo.test', password: hashPassword('reviewer123'), role: 'reviewer', createdAt: now }
    ],
    // Staggered timestamps keep the catalog order stable.
    challenges: starterChallenges.map((challenge, index) => ({
      ...challenge, id: `starter-${index + 1}`, creatorId: 'demo-reviewer', status: 'published',
      createdAt: new Date(Date.parse(now) + index * 1000).toISOString()
    }))
  };
}
