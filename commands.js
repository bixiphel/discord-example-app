import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Command containing options
const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

// Flip coin command
const FLIP_COMMAND = {
  name: 'flip',
  description: 'Flip a coin!',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Roll die command
const DICE_COMMAND = {
  name: 'roll',
  description: 'Roll a die with optional number of sides',
  type: 1,
  options: [
    {
      type: 4, // INTEGER
      name: 'sides',
      description: 'Number of sides on the die (default is 6)',
      required: false,
    },
    {
      type: 4, // INTEGER
      name: 'count',
      description: 'Number of dice to roll (default is 1, max is 100)',
      required: false,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Uptime command
const UPTIME_COMMAND = {
  name: 'uptime',
  description: 'Show how long the bot has been running',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Latency command
const PING_COMMAND = {
  name: 'ping',
  description: 'Check bot and API latency. Returns the total time in milliseconds.',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Math command
const MATH_COMMAND = {
  name: 'math',
  description: 'Calculate a basic math expression (e.g., 5 + 2 * 3)',
  type: 1,
  options: [
    {
      type: 3, // STRING
      name: 'expression',
      description: 'The math expression to evaluate (e.g. 5 + 2 * 3)',
      required: true,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// toBinary command
const BINARY_COMMAND = {
  name: 'binary',
  description: 'Encode or decode binary',
  type: 1,
  options: [
    {
      name: 'direction',
      description: 'Encode to binary or decode from binary',
      type: 3, // STRING
      required: true,
      choices: [
        { name: 'Encode', value: 'encode' },
        { name: 'Decode', value: 'decode' }
      ]
    },
    {
      name: 'input',
      description: 'The text or binary to convert',
      type: 3, // STRING
      required: true
    }
  ]
}


const ALL_COMMANDS = [BINARY_COMMAND, TEST_COMMAND, CHALLENGE_COMMAND, FLIP_COMMAND, DICE_COMMAND, UPTIME_COMMAND, PING_COMMAND, MATH_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
