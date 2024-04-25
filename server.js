import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import userModel from './src/models/User.js';
import connectDb from './src/config/db.js';
import eventModel from './src/models/Event.js';
import {message} from 'telegraf/filters';
import {GoogleGenerativeAI} from '@google/generative-ai';


dotenv.config();


const bot = new Telegraf(process.env.BOT_TOKEN);

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig: {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  }});




try {
    connectDb();
    console.log("Hurrah!!Database Connected Successfully..")
  } catch (err) {
    console.log(err);
    process.kill(process.pid, 'SIGTERM');
  }
  

bot.start(async (ctx) => {

    console.log('ctx:', ctx);
    const from = ctx.update.message.from;

    console.log('from', from);

    try {
        await userModel.findOneAndUpdate({ tgId: from.id }, {
            $setOnInsert: {
                firstName: from.first_name,
                lastName: from.last_name,
                isBot: from.is_bot,
                username: from.username
            }
        }, { upsert: true, new: true });


        await ctx.reply(
            `Hey! ${from.first_name}, Greetings. I'll be crafting very captivating social media content for you 🚀. Please don't stop providing me with updates on the day's activities. Let's be beautiful on social media✨`
        );
        
    } catch (err) {
        console.log(err);

        await ctx.reply("Managing Difficulties");
    }
    

    
});

bot.help((ctx) => {
    ctx.reply('For support contact @Taimoor');
  });
  

bot.command('generate', async (ctx) => {
    const from = ctx.update.message.from;

    const {message_id:waitingMessageId} = await ctx.reply(
        `Hey! ${from.first_name}, kindly wait for a moment. I am curating posts for you 🚀✨`
    );

    const { message_id: stickerWaitingId } = await ctx.replyWithSticker(
        'CAACAgIAAxkBAAOAZigFqNL7NkZvZySg84A9nvUhnc4AAm4FAAI_lcwKhjrZXYi8tzU0BA'
      );
    console.log('messageId', waitingMessageId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfTheDay = new Date();
    endOfTheDay.setHours(23, 59, 59, 999);

    // get events for the user
    const events = await eventModel.find({
        tgId: from.id,
        createdAt: {
            $gte: startOfDay,
            $lte: endOfTheDay
        }
    });

    if (events.length === 0) {
        await ctx.deleteMessage(waitingMessageId);
        await ctx.deleteMessage(stickerWaitingId);

        await ctx.reply('No events for the day.');
        return;
    }

    async function generateContent() {
        try {
            const prompt = [
                {
                    role: 'system',
                    content: 'Act as a senior copywriter, you write highly engaging posts for LinkedIn, Facebook, and Twitter using provided thoughts/events throughout the day.'
                },
                {
                    role: 'user',
                    content: `
                        Write like a human, for humans. Craft three engaging social media posts tailored for LinkedIn, Facebook, and Twitter audiences. Use simple language. Use given time labels just to understand the order of the event, don't mention the time in the posts. Each post should creatively highlight the following events. Ensure the tone is conversational and impactful. Focus on engaging the respective platform's audience, encouraging interaction, and driving interest in the events and dont highlight the headings of Facebook twitter and linkedin text:
            
                        ${events.map(event => event.text).join(', ')}
                    `
                }
            ];
            
            const promptString = JSON.stringify(prompt);
            
            
          const data = await model.generateContent(promptString);
          const response = await data.response;
          const text =  response.text();
          console.log(data);
          await ctx.deleteMessage(stickerWaitingId)
          await ctx.deleteMessage(waitingMessageId);


           await ctx.reply(text);
        } catch(error) {
          console.log(err);
          await ctx.reply("Facing Difficulties");
        }
      }
      
      generateContent();

    
});

// bot.on('message', (ctx) => {
//     console.log('sticker', ctx.update.message);
// });


bot.on(message('text'), async (ctx) => {
    const from = ctx.update.message.from;
    const message = ctx.update.message.text;

    try {
        await eventModel.create({
            text: message,
            tgId: from.id,
        });

        await ctx.reply('Got it! 👍 Feel free to keep sharing your thoughts with me. To generate posts, simply use the command: /generate');
    } catch (err) {
        console.log(err);
        await ctx.reply('Facing difficulties, please try again later.');
    }
});



bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
