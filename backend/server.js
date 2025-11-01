import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatbotRoutes from './routes/chatbot.js';

dotenv.config();

// Debug: Check if API key is loaded
console.log('🔑 API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes ✅' : 'No ❌');
console.log('🔑 API Key length:', process.env.GEMINI_API_KEY?.length || 0);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chatbot', chatbotRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/chatbot`);
});