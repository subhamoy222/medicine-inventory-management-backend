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
import ocrBillRoutes from './routes/ocrBillRoutes.js';

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

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (optional)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    routes: {
      users: '/api/users',
      bills: '/api/bills',
      expiryBills: '/api/expiry-bills',
      inventory: '/api/inventory',
      expiry: '/api/expiry',
      purchaseReturns: '/api/purchase-returns'
    }
  });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Medicine Inventory Management API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/users/register',
        login: 'POST /api/users/login',
        verifyEmail: 'POST /api/users/verify-email',
        resendVerification: 'POST /api/users/resend-verification',
        profile: 'GET /api/users/profile',
        batchDetails: 'GET /api/users/batch-details'
      },
      bills: 'GET|POST|PUT|DELETE /api/bills',
      expiryBills: 'GET|POST|PUT|DELETE /api/expiry-bills',
      inventory: 'GET|POST|PUT|DELETE /api/inventory',
      expiry: 'GET|POST|PUT|DELETE /api/expiry',
      purchaseReturns: 'GET|POST|PUT|DELETE /api/purchase-returns'
    }
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

  // Handle inventory updates
  socket.on('inventory-update', (data) => {
    socket.broadcast.emit('inventory-changed', data);
  });

  // Handle bill updates
  socket.on('bill-update', (data) => {
    socket.broadcast.emit('bill-changed', data);
  });

  // Handle expiry updates
  socket.on('expiry-update', (data) => {
    socket.broadcast.emit('expiry-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes - Order matters for route matching
app.use('/api/users', userRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/expiry-bills', expiryBillRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/ocr-bill', ocrBillRoutes);

// Additional utility routes that might be needed
app.get('/api/status', (req, res) => {
  res.status(200).json({
    server: 'running',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Test route for checking authentication
app.get('/api/test-auth', (req, res) => {
  const token = req.headers.authorization;
  res.status(200).json({
    message: 'Auth test endpoint',
    hasToken: !!token,
    token: token ? 'Token provided' : 'No token'
  });
});

// Error Handling Middleware
app.use(errorMiddleware);

// 404 Handler - This should be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      '/api/users/*',
      '/api/bills/*',
      '/api/expiry-bills/*',
      '/api/inventory/*',
      '/api/expiry/*',
      '/api/purchase-returns/*',
      '/health',
      '/api'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
  console.log(`📋 API info available at: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server initialized`);
  console.log(`📱 CORS enabled for frontend domains`);
  
  // Log all available routes
  console.log('\n📍 Available API Routes:');
  console.log('   Authentication:');
  console.log('     POST /api/users/register');
  console.log('     POST /api/users/login');
  console.log('     POST /api/users/verify-email');
  console.log('     POST /api/users/resend-verification');
  console.log('     GET  /api/users/profile');
  console.log('     GET  /api/users/batch-details');
  console.log('   Data Routes:');
  console.log('     /api/bills/*');
  console.log('     /api/expiry-bills/*');
  console.log('     /api/inventory/*');
  console.log('     /api/expiry/*');
  console.log('     /api/purchase-returns/*');
  console.log('   Utility Routes:');
  console.log('     GET  /health');
  console.log('     GET  /api');
  console.log('     GET  /api/status');
  console.log('     GET  /api/test-auth\n');
});

export default app;


