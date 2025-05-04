import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // For generating tokens
import { sendVerificationEmail } from '../utils/emailService.js'; // For sending verification emails
import generateToken from '../utils/generateToken.js';
import { getBatchDetails } from "../controllers/billController.js"; // Assuming the batchDetails function is already implemented

const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, gstNo } = req.body;

    // Check if the passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        // Convert email to lowercase for case-insensitive storage
        const normalizedEmail = email.toLowerCase();

        // Check if the user already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create a new user instance
        const user = new User({
            name,
            email: normalizedEmail, // Save email as lowercase
            password: hashedPassword,
            gstNo,
            verificationToken, // Store the token for email verification
            isVerified: false, // Initially, the user is not verified
        });

        // Save the user to the database
        await user.save();

        // Send verification email
        await sendVerificationEmail(normalizedEmail, verificationToken);

        // Send a response to the client
        res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Email Verification Route
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
        // Find the user with the provided verification token
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Update the user's verification status
        user.isVerified = true;
        user.verificationToken = null; // Clear the token after verification
        await user.save();

        res.status(200).json({ message: 'Email verified successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
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

