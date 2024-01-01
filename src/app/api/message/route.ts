import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { initialProgrammerMessages } from "./messages";
export const runtime = 'edge'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const { content } = await req.json()  
    
    const chatCompletion = await openai.chat.completions.create({
        messages: [...initialProgrammerMessages, { role: "user", content}],
        model: "gpt-4-vision-preview",
        stream: true,
        max_tokens: 4096
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(chatCompletion);
    // Respond with the stream
    return new StreamingTextResponse(stream);
    
}