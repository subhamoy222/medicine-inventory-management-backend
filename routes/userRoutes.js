import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // For generating tokens
import { sendVerificationEmail } from '../utils/emailService.js'; // For sending verification emails
import generateToken from '../utils/generateToken.js';
import { getBatchDetails } from "../controllers/billController.js"; // Assuming the batchDetails function is already implemented

import jwt from 'jsonwebtoken';

import { sendVerificationCodeEmail } from '../utils/emailService.js'; // Updated import
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register Route
// router.post('/register', async (req, res) => {
//     const { name, email, password, confirmPassword, gstNo } = req.body;

//     // Check if the passwords match
//     if (password !== confirmPassword) {
//         return res.status(400).json({ message: 'Passwords do not match' });
//     }

//     try {
//         // Convert email to lowercase for case-insensitive storage
//         const normalizedEmail = email.toLowerCase();

//         // Check if the user already exists
//         const userExists = await User.findOne({ email: normalizedEmail });
//         if (userExists) {
//             return res.status(400).json({ message: 'User already exists' });
//         }

//         // Hash the password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // Generate a verification token
//         const verificationToken = crypto.randomBytes(32).toString('hex');

//         // Create a new user instance
//         const user = new User({
//             name,
//             email: normalizedEmail, // Save email as lowercase
//             password: hashedPassword,
//             gstNo,
//             verificationToken, // Store the token for email verification
//             isVerified: false, // Initially, the user is not verified
//         });

//         // Save the user to the database
//         await user.save();

//         // Send verification email
//         await sendVerificationEmail(normalizedEmail, verificationToken);

//         // Send a response to the client
//         res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // Email Verification Route
// router.get('/verify-email', async (req, res) => {
//     const { token } = req.query;

//     try {
//         // Find the user with the provided verification token
//         const user = await User.findOne({ verificationToken: token });

//         if (!user) {
//             return res.status(400).json({ message: 'Invalid or expired token' });
//         }

//         // Update the user's verification status
//         user.isVerified = true;
//         user.verificationToken = null; // Clear the token after verification
//         await user.save();

//         res.status(200).json({ message: 'Email verified successfully!' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// Registration Route with 6-digit verification code




// User Registration Route with 6-digit verification
router.use((req, res, next) => {
    console.log('\n🔍 USER ROUTE DEBUG:');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Full URL:', req.originalUrl);
    console.log('Headers:', {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Present' : 'Missing',
        'origin': req.headers.origin
    });
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    console.log('=====================================\n');
    next();
});

// Test route to check if user routes are working
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'User routes are working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path
    });
});

// User Registration Route with enhanced debugging
router.post('/register', async (req, res) => {
    console.log('🚀 Registration attempt started');
    console.log('Request body received:', req.body);
    
    try {
        const { name, email, password, confirmPassword, gstNo } = req.body;

        // Detailed validation logging
        console.log('Extracted fields:', { 
            name: name ? 'Present' : 'Missing', 
            email: email ? 'Present' : 'Missing', 
            password: password ? 'Present' : 'Missing', 
            confirmPassword: confirmPassword ? 'Present' : 'Missing', 
            gstNo: gstNo ? 'Present' : 'Missing' 
        });

        // Validate required fields
        if (!name || !email || !password || !confirmPassword) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false,
                message: 'All fields are required',
                missingFields: {
                    name: !name,
                    email: !email,
                    password: !password,
                    confirmPassword: !confirmPassword
                }
            });
        }

        // Check if the passwords match
        if (password !== confirmPassword) {
            console.log('❌ Passwords do not match');
            return res.status(400).json({ 
                success: false,
                message: 'Passwords do not match' 
            });
        }

        // Convert email to lowercase for case-insensitive storage
        const normalizedEmail = email.toLowerCase();
        console.log('📧 Normalized email:', normalizedEmail);

        // Check if the user already exists
        console.log('🔍 Checking if user exists...');
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            console.log('❌ User already exists');
            return res.status(400).json({ 
                success: false,
                message: 'User already exists' 
            });
        }

        console.log('🔐 Hashing password...');
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('🎲 Generating verification code...');
        // Generate a 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set expiration time (10 minutes from now)
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

        console.log('👤 Creating user object...');
        // Create a new user instance
        const user = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            gstNo,
            verificationCode,
            verificationExpires,
            isVerified: false,
        });

        console.log('💾 Saving user to database...');
        // Save the user to the database
        await user.save();
        console.log('✅ User saved successfully');

        console.log('📨 Sending verification email...');
        // Send verification email with 6-digit code
        await sendVerificationCodeEmail(normalizedEmail, verificationCode);
        console.log('✅ Verification email sent');

        // Send a response to the client
        res.status(201).json({ 
            success: true,
            message: 'User registered successfully. Please check your email for verification code.',
            user: {
                email: normalizedEmail,
                name: name,
                isVerified: false
            }
        });
        
        console.log('✅ Registration completed successfully');
    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Email Verification Route with debugging
router.post('/verify-email', async (req, res) => {
    console.log('🔐 Email verification attempt started');
    console.log('Request body:', req.body);
    
    const { email, verificationCode } = req.body;

    // Validate input
    if (!email || !verificationCode) {
        console.log('❌ Missing email or verification code');
        return res.status(400).json({ 
            success: false,
            message: 'Email and verification code are required',
            received: { email: !!email, verificationCode: !!verificationCode }
        });
    }

    try {
        console.log('🔍 Looking for user with email and code...');
        // Find the user with the provided email and verification code
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            verificationCode: verificationCode
        });

        if (!user) {
            console.log('❌ Invalid verification code or email');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid verification code or email' 
            });
        }

        // Check if the verification code has expired
        if (user.verificationExpires < new Date()) {
            console.log('❌ Verification code has expired');
            return res.status(400).json({ 
                success: false,
                message: 'Verification code has expired. Please request a new one.' 
            });
        }

        console.log('✅ Updating user verification status...');
        // Update the user's verification status
        user.isVerified = true;
        user.verificationCode = null;
        user.verificationExpires = null;
        await user.save();

        res.status(200).json({ 
            success: true,
            message: 'Email verified successfully! You can now log in.' 
        });
        
        console.log('✅ Email verification completed successfully');
    } catch (error) {
        console.error('❌ Email verification error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during email verification' 
        });
    }
});

// Resend Verification Code Route with debugging
router.post('/resend-verification', async (req, res) => {
    console.log('🔄 Resend verification attempt started');
    const { email } = req.body;

    // Validate input
    if (!email) {
        console.log('❌ Missing email');
        return res.status(400).json({ 
            success: false,
            message: 'Email is required' 
        });
    }

    try {
        console.log('🔍 Finding user...');
        // Find the user
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('❌ User not found');
            return res.status(400).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        if (user.isVerified) {
            console.log('❌ Email already verified');
            return res.status(400).json({ 
                success: false,
                message: 'Email is already verified' 
            });
        }

        console.log('🎲 Generating new verification code...');
        // Generate a new 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set new expiration time (10 minutes from now)
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Update user with new code
        user.verificationCode = verificationCode;
        user.verificationExpires = verificationExpires;
        await user.save();

        console.log('📨 Resending verification email...');
        // Send new verification email
        await sendVerificationCodeEmail(email.toLowerCase(), verificationCode);

        res.status(200).json({ 
            success: true,
            message: 'Verification code resent successfully. Please check your email.' 
        });
        
        console.log('✅ Resend verification completed successfully');
    } catch (error) {
        console.error('❌ Resend verification error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during resending verification code' 
        });
    }
});

// Login Route with debugging
router.post('/login', async (req, res) => {
    console.log('🔑 Login attempt started');
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({ 
            success: false,
            message: 'Email and password are required',
            received: { email: !!email, password: !!password }
        });
    }

    try {
        console.log('🔍 Finding user by email...');
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('❌ User not found');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Check if the user has verified their email
        if (!user.isVerified) {
            console.log('❌ Email not verified');
            return res.status(400).json({ 
                success: false,
                message: 'Please verify your email before logging in.',
                needsVerification: true
            });
        }

        console.log('🔐 Comparing passwords...');
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log('❌ Password mismatch');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        console.log('🎫 Generating token...');
        // Generate token for the authenticated user with both id and email
        const token = generateToken(user._id, user.email);

        // Send the token in the response
        res.status(200).json({ 
            success: true,
            message: 'Login successful',
            token: token, 
            email: email.toLowerCase(),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                gstNo: user.gstNo,
                isVerified: user.isVerified
            }
        });
        
        console.log('✅ Login completed successfully');
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login' 
        });
    }
});

// Get user profile (protected route) with debugging
router.get('/profile', isAuthenticated, async (req, res) => {
    console.log('👤 Profile request started');
    console.log('User from token:', req.user);
    
    try {
        const user = await User.findById(req.user.id).select('-password -verificationCode');
        
        if (!user) {
            console.log('❌ User not found in database');
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                gstNo: user.gstNo,
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
        
        console.log('✅ Profile fetched successfully');
    } catch (error) {
        console.error('❌ Profile fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error fetching profile' 
        });
    }
});

// Batch Details Route
router.get('/batch-details', getBatchDetails);







// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if the user has verified their email
        if (!user.isVerified) {
            return res.status(400).json({ message: 'Please verify your email before logging in.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token for the authenticated user with both id and email
        const token = generateToken(user._id, user.email);

        // Send the token in the response
        res.status(200).json({ token: token, email: email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

