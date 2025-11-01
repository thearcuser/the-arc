import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables first
dotenv.config();

const router = express.Router();

// Validate API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not configured!');
  throw new Error('GEMINI_API_KEY is required');
}

// Initialize Gemini AI with the correct syntax
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt for The Arc chatbot
const SYSTEM_PROMPT = `You are The Arc Assistant, an AI helper for "The Arc" platform - a revolutionary platform connecting startups, individuals, investors, and cofounders.

PLATFORM FEATURES:
- Tinder-like swipe interface (swipe right to like, left to pass)
- Pitch video uploads for startups and individuals
- Investor discovery and connection
- Cofounder matching
- Profile customization
- Real-time messaging after matches

YOUR CAPABILITIES:
1. Platform Guidance: Explain features, how to use the swipe interface, profile setup, video uploads
2. Pitch Video Tips: Best practices for creating compelling pitch videos (length, content, presentation)
3. Startup Market News: Share insights about funding trends, rising domains, market opportunities
4. Investor Relations: Advice on approaching investors, what they look for
5. Cofounder Matching: Tips on finding the right cofounder, team building
6. Networking Strategies: How to make the most of the platform

GUIDELINES:
- Be friendly, enthusiastic, and supportive
- Keep responses concise but informative (2-4 paragraphs max)
- Use emojis sparingly for warmth
- For irrelevant questions, politely redirect to platform-related topics
- Provide actionable advice
- Remember context from the conversation

Always maintain a supportive, professional tone that inspires confidence in users.`;

router.post('/', async (req, res) => {
  try {
    const { message, chatHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    console.log('📤 Sending request to Gemini API...');

    // Get the generative model - use gemini-1.5-flash or gemini-1.5-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build conversation context
    let conversationContext = SYSTEM_PROMPT + '\n\n';
    
    // Add recent chat history (last 10 messages for context)
    if (chatHistory && Array.isArray(chatHistory)) {
      const recentHistory = chatHistory.slice(-10);
      recentHistory.forEach(msg => {
        if (msg.type === 'user') {
          conversationContext += `User: ${msg.content}\n`;
        } else if (msg.type === 'bot') {
          conversationContext += `Assistant: ${msg.content}\n`;
        }
      });
    }

    conversationContext += `User: ${message}\nAssistant:`;

    // Generate content with the new syntax
    const result = await model.generateContent(conversationContext);
    const response = result.response;
    const botResponse = response.text();

    console.log('✅ Response received from Gemini API');

    // Check if response indicates irrelevant question
    const isIrrelevant = botResponse.toLowerCase().includes('specifically designed to help') ||
                         botResponse.toLowerCase().includes('not related to');

    let suggestions = [];
    
    if (isIrrelevant) {
      suggestions = [
        "How does the swipe feature work?",
        "Tips for a great pitch video",
        "How to attract investors?"
      ];
    }

    res.json({
      response: botResponse,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chatbot error:', error.message);
    console.error('Full error:', error);
    
    res.status(500).json({
      error: 'Failed to generate response',
      response: "I'm having trouble connecting right now. Please make sure:\n1. Your API key is valid\n2. You have API quota remaining\n3. Try again in a moment.",
      suggestions: [
        "Tell me about The Arc features",
        "How do I create a pitch video?",
        "What are investors looking for?"
      ]
    });
  }
});

export default router;