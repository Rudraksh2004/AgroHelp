const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// This is where we'll store conversation history, indexed by some session ID.
// For this simple example, we'll just use a single global variable.
let conversationHistory = [];

app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.userMessage;
        const userLocation = req.body.userLocation;
        const userLanguage = req.body.userLanguage;
        
        let systemPrompt = "You are a helpful and friendly chatbot specializing in agricultural advice. Your goal is to assist users with their questions and tasks related to farming in a clear and conversational manner. Be concise with your answers.";
        
        // Dynamically add the location and language to the system prompt
        if (userLocation) {
            systemPrompt += ` The current location for all advice is ${userLocation}. Incorporate this context where relevant to provide localized advice.`;
        } else {
            systemPrompt += " The user has not specified a location yet. Ask them for their city or state in India to provide them with the most accurate advice.";
        }

        if (userLanguage) {
            systemPrompt += ` All responses must be in ${userLanguage}. Do not use any other language.`;
        }

        // Construct the full conversation history for the model
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                },
                ...conversationHistory // Append the existing conversation history
            ],
            generationConfig: {
                maxOutputTokens: 200,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();

        // Update the conversation history to include the new message and response
        conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });
        conversationHistory.push({ role: "model", parts: [{ text: text }] });

        res.json({ botResponse: text });
        
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});