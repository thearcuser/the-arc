import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatbotRoutes from './routes/chatbot.js';

dotenv.config();

// Debug: Check if API key is loaded
console.log('🔑 API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes ✅' : 'No ❌');
console.log('🔑 API Key length:', process.env.GEMINI_API_KEY?.length || 0);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://the-arc-lvk8.onrender.com',
        'https://the-arc-navy.vercel.app',
        'https://www.your-frontend-domain.vercel.app'
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'The Arc API is running',
    status: 'healthy',
    version: '1.0.0',
    endpoints: {
      chatbot: '/api/chatbot',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/chatbot', chatbotRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/chatbot/chat'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({ 
    error: statusCode === 500 ? 'Internal server error' : message,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// Start server (only in non-Vercel environment)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/api/chatbot`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
}

// Export for Vercel serverless function
export default app;
