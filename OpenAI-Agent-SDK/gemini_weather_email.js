#!/usr/bin/env node
import axios from 'axios';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* =========================
   Schemas
   ========================= */
const GetWeatherResultSchema = z.object({
  city: z.string().describe('name of the city'),
  degree_c: z.number().describe('the degree celsius of the temp'),
  condition: z.string().optional().describe('condition of the weather'),
});

const SendEmailParamsSchema = z.object({
  toEmail: z.string().email().describe('email address to'),
  subject: z.string().min(1).describe('subject'),
  body: z.string().min(1).describe('body of the email'),
});

/* ===============
   Tool impls
   =============== */
async function getWeatherTool({ city }) {
  if (!city || typeof city !== 'string') throw new Error('city is required');
  const url = `https://wttr.in/${encodeURIComponent(city.toLowerCase())}?format=%C+%t`;
  const response = await axios.get(url, { responseType: 'text' });
  const raw = String(response.data).trim(); // e.g. "Partly cloudy +27°C"

  const tempMatch = raw.match(/([-+]?\d+)\s*°C/i);
  const degree_c = tempMatch ? Number(tempMatch[1]) : NaN;
  const condition = raw.replace(/([-+]?\d+\s*°C)/i, '').trim();

  return GetWeatherResultSchema.parse({
    city,
    degree_c: Number.isFinite(degree_c) ? degree_c : NaN,
    condition: condition || undefined,
  });
}

async function sendEmailTool({ toEmail, subject, body }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    throw new Error('Missing SMTP config: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL');
  }
  const params = SendEmailParamsSchema.parse({ toEmail, subject, body });

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to: params.toEmail,
    subject: params.subject,
    text: params.body,
  });

  return { messageId: info.messageId };
}

/* =========================
   Gemini tool declarations
   ========================= */
const functionDeclarations = [
  {
    name: 'get_weather',
    description: 'returns the current weather information for the given city',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: 'name of the city' },
      },
      required: ['city'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email with provided subject and body',
    parameters: {
      type: 'OBJECT',
      properties: {
        toEmail: { type: 'STRING', description: 'recipient email address' },
        subject: { type: 'STRING', description: 'email subject' },
        body: { type: 'STRING', description: 'email body text' },
      },
      required: ['toEmail', 'subject', 'body'],
    },
  },
];

const toolsMap = {
  get_weather: getWeatherTool,
  send_email: sendEmailTool,
};

/* =========================
   Helper: tool-call loop
   ========================= */
function extractFunctionCalls(resp) {
  // Looks through parts for functionCall entries
  const parts = resp?.response?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter(p => p.functionCall)
    .map(p => p.functionCall);
}

function buildFunctionResponsePart(name, responseObj) {
  return {
    functionResponse: {
      name,
      response: responseObj, // must be JSON-serializable
    },
  };
}

/* =========
   CLI args
   ========= */
const argv = yargs(hideBin(process.argv))
  .option('city', { type: 'string', demandOption: true, describe: 'City to fetch weather for' })
  .option('to', { type: 'string', demandOption: true, describe: 'Recipient email address' })
  .option('subject', { type: 'string', demandOption: false, describe: 'Custom email subject (optional)' })
  .strict()
  .help().argv;

/* =================
   Main
   ================= */
async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations }],
    systemInstruction:
      'You are an expert weather agent. When given a city and recipient email, ' +
      '1) call get_weather(city), then 2) compose a clear email body summarizing the weather, and 3) call send_email. ' +
      'Return a short confirmation message after tools are complete.',
  });

  // Seed user message with the structured inputs; the model will still decide tool usage.
  const userPrompt = `City: ${argv.city}\nRecipient: ${argv.to}\n${
    argv.subject ? `Preferred subject: ${argv.subject}\n` : ''
  }Please email the current weather for the city to the recipient.`;

  // Start a tool loop
  let history = [
    { role: 'user', parts: [{ text: userPrompt }] },
  ];

  // First turn
  let resp = await model.generateContent({ contents: history });

  // Execute tools as long as the model requests them
  let safetyCounter = 0;
  while (true) {
    if (++safetyCounter > 6) throw new Error('Too many tool-call iterations.');

    const calls = extractFunctionCalls(resp);
    if (!calls || calls.length === 0) break; // no tool calls, model is done

    for (const call of calls) {
      const name = call.name;
      const args = call.args || {};
      if (!(name in toolsMap)) {
        throw new Error(`Unknown tool requested by model: ${name}`);
      }

      // Execute tool
      const result = await toolsMap[name](args);

      // Add function response back to the conversation
      history.push({ role: 'model', parts: [{ functionCall: call }] });
      history.push({ role: 'tool', parts: [buildFunctionResponsePart(name, result)] });
    }

    // Ask model to continue with tool outputs provided
    resp = await model.generateContent({ contents: history });
  }

  // Final model message
  const finalText =
    resp?.response?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') ||
    'Done.';

  console.log(finalText);
}

main().catch(err => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});
