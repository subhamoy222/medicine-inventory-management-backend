import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import Routes
import userRoutes from './routes/userRoutes.js';
import billRoutes from './routes/billRoutes.js';
import expiryBillRoutes from './routes/expiryBillRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import expiryRoutes from './routes/expiryRoutes.js';
import purchaseReturnRoutes from './routes/purchaseReturnRoutes.js';

// Middleware
import errorMiddleware from './middleware/errorMiddleware.js';

// Load Environment Variables
dotenv.config({ path: './config/.env' });

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'https://medicine-inventory-system.vercel.app',
      'https://medicine-inventory-management-frontend-ml4e.vercel.app',
      'https://medicine-inventory-management-backend.onrender.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Store socket instance for use in other modules
global.io = io;

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'https://medicine-inventory-system.vercel.app',
    'https://medicine-inventory-management-frontend-ml4e.vercel.app',
    'https://medicine-inventory-management-backend.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Add additional headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle room join for user-specific updates
  socket.on('join', (userData) => {
    if (userData && userData.email) {
      socket.join(userData.email);
      console.log(`User ${userData.email} joined their room`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/expiry-bills', expiryBillRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);

// Error Handling Middleware
app.use(errorMiddleware);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server initialized`);
});

export default app;




