import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

// Tracks the app's uptime
const START_TIME = Date.now();

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  // Used to measure total latency between the time the user sends a command to when the bot replies
  // *Note that this includes the time it takes for the bot to respond to the command *PLUS* the time it takes to interact with the Discord API.
  const receivedAt = Date.now();
  console.log("Received at: " + receivedAt);

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    }

    // "challenge" command
    if (name === 'challenge' && id) {
      // Interaction context
      const context = req.body.context;
      // User ID is in user field for (G)DMs, and member for servers
      const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
      // User's object choice
      const objectName = req.body.data.options[0].value;

      // Create active game using message ID as the game ID
      activeGames[id] = {
        id: userId,
        objectName,
      };

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: `Rock papers scissors challenge from <@${userId}>`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  // Append the game ID to use later on
                  custom_id: `accept_button_${req.body.id}`,
                  label: 'Accept',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }

    // "flip" command
    if (data.name === 'flip') {
      const result = Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: result,
        },
      });
    }  

    // "roll" command
    if (data.name === 'roll') {
      const sidesOption = data.options?.find(opt => opt.name === 'sides');
      const countOption = data.options?.find(opt => opt.name === 'count');
    
      const sides = sidesOption ? Math.max(2, sidesOption.value) : 6;
      const count = countOption ? Math.min(Math.max(1, countOption.value), 100) : 1;
    
      const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      const total = rolls.reduce((sum, val) => sum + val, 0);
    
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🎲 Rolled ${count} d${sides}: [${rolls.join(', ')}] → Total: **${total}**`,
        },
      });
    }

    // "uptime" command
    if (data.name === 'uptime') {
      const uptimeMs = Date.now() - START_TIME;
      const seconds = Math.floor((uptimeMs / 1000) % 60);
      const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
      const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    
      const parts = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (minutes) parts.push(`${minutes}m`);
      if (seconds || parts.length === 0) parts.push(`${seconds}s`);
    
      const formatted = parts.join(' ');
    
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `⏱️ Uptime: ${formatted}`,
        },
      });
    }

    // "ping" command
    if (data.name === 'ping') {
      const processingEnd = Date.now();
      const latency = processingEnd - receivedAt;
      console.log("Processed at: " + processingEnd);
      console.log("Time difference: " + (processingEnd - receivedAt));
    
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🏓 Pong! Total latency: ${latency}ms`,
        },
      });
    }
    
    // "math" command
    if (data.name === 'math') {
      const expr = data.options.find(opt => opt.name === 'expression').value;
      const safeExpr = expr.replace(/[^-()\d/*+.]/g, '');
    
      try {
        const result = Function(`return (${safeExpr})`)();
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🧮 Result: ${expr} = **${result}**`,
          },
        });
      } catch (err) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Could not evaluate the expression.',
          },
        });
      }
    }
    
    // "binary" command
    if (name === 'binary') {
      const direction = data.options.find(opt => opt.name === 'direction')?.value;
      const input = data.options.find(opt => opt.name === 'input')?.value;
    
      if (!direction || !input) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Missing direction or input.',
          },
        });
      }
    
      let result;
      try {
        if (direction === 'encode') {
          result = input
            .split('')
            .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
            .join(' ');
        } else if (direction === 'decode') {
          result = input
            .split(' ')
            .map(bin => String.fromCharCode(parseInt(bin, 2)))
            .join('');
        } else {
          throw new Error('Invalid direction');
        }
      } catch (err) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Could not convert the input. Make sure it\'s valid.',
          },
        });
      }
    
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🧠 **${direction === 'encode' ? 'Binary' : 'Text'} Result:**\n\`\`\`\n${result}\n\`\`\``,
        },
      });
    }
    
    // "hex" command
    if (name === 'hex') {
      const direction = data.options.find(opt => opt.name === 'direction')?.value;
      const input = data.options.find(opt => opt.name === 'input')?.value;
    
      if (!direction || !input) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Missing direction or input.',
          },
        });
      }
    
      let result;
      try {
        if (direction === 'encode') {
          result = input
            .split('')
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join(' ');
        } else if (direction === 'decode') {
          result = input
            .split(' ')
            .map(hex => String.fromCharCode(parseInt(hex, 16)))
            .join('');
        } else {
          throw new Error('Invalid direction');
        }
      } catch (err) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Could not convert the input. Make sure it\'s valid hex or text.',
          },
        });
      }
    
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🔢 **${direction === 'encode' ? 'Hex' : 'Text'} Result:**\n\`\`\`\n${result}\n\`\`\``,
        },
      });
    }
    
    // "sort" command
    if (name === 'sort') {
      const input = data.options.find(opt => opt.name === 'input')?.value;
    
      try {
        const numbers = input
          .split(',')
          .map(n => parseFloat(n.trim()))
          .filter(n => !isNaN(n));
    
        if (numbers.length === 0) {
          throw new Error('No valid numbers found');
        }
    
        const sorted = numbers.sort((a, b) => a - b);
    
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🔢 Sorted result:\n\`\`\`\n${sorted.join(', ')}\n\`\`\``,
          },
        });
      } catch (err) {
        console.error('Error in sort command:', err);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Could not parse the numbers. Please enter a comma-separated list like `5, 2, 9, 1`.',
          },
        });
      }
    }

    // "fibonacci" command
    if (name === 'fibonacci') {
      const n = data.options.find(opt => opt.name === 'n')?.value;
    
      if (n < 1 || n > 100) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ Please choose a number between 1 and 250.',
          },
        });
      }
    
      const fib = [0, 1];
      for (let i = 2; i < n; i++) {
        fib.push(fib[i - 1] + fib[i - 2]);
      }
    
      const result = fib.slice(0, n).join(', ');
    
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🔢 First ${n} Fibonacci numbers:\n\`\`\`\n${result}\n\`\`\``,
        },
      });
    }
        
    

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  /**
   * Handle requests from interactive components
   * See https://discord.com/developers/docs/interactions/message-components#responding-to-a-component-interaction
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;

    if (componentId.startsWith('accept_button_')) {
      // get the associated game ID
      const gameId = componentId.replace('accept_button_', '');
      // Delete message with token in request body
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
      try {
        await res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'What is your object of choice?',
            // Indicates it'll be an ephemeral message
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.STRING_SELECT,
                    // Append game ID
                    custom_id: `select_choice_${gameId}`,
                    options: getShuffledOptions(),
                  },
                ],
              },
            ],
          },
        });
        // Delete previous message
        await DiscordRequest(endpoint, { method: 'DELETE' });
      } catch (err) {
        console.error('Error sending message:', err);
      }
    } else if (componentId.startsWith('select_choice_')) {
      // get the associated game ID
      const gameId = componentId.replace('select_choice_', '');

      if (activeGames[gameId]) {
        // Interaction context
        const context = req.body.context;
        // Get user ID and object choice for responding user
        // User ID is in user field for (G)DMs, and member for servers
        const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
        const objectName = data.values[0];
        // Calculate result from helper function
        const resultStr = getResult(activeGames[gameId], {
          id: userId,
          objectName,
        });

        // Remove game from storage
        delete activeGames[gameId];
        // Update message with token in request body
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

        try {
          // Send results
          await res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: resultStr },
          });
          // Update ephemeral message
          await DiscordRequest(endpoint, {
            method: 'PATCH',
            body: {
              content: 'Nice choice ' + getRandomEmoji(),
              components: [],
            },
          });
        } catch (err) {
          console.error('Error sending message:', err);
        }
      }
    }
    
    return;
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});