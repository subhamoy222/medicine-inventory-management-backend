// // controllers/authController.js
// import jwt from 'jsonwebtoken';
// import User from '../models/User.js'; // Your user model (if you have one)

// export const generateToken = (user) => {
//     return jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
// };

// // Example of using this in a login or register function
// export const loginUser = async (req, res) => {
//     const { email, password } = req.body;

//     // Find user and verify password (add your logic here)
//     const user = await User.findOne({ email });

//     if (!user || user.password !== password) {
//         return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const token = generateToken(user); // Generate JWT token
//     res.status(200).json({ message: 'Login successful', token });
// };

import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure this path is correct
import bcrypt from 'bcrypt'; // For secure password comparison

// Function to generate JWT token
export const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email }, // Include user ID for better identification
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

// Login function
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password using bcrypt (assuming passwords are hashed in the database)
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user);
        res.status(200).json({ message: 'Login successful', token:token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

