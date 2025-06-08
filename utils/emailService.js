// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';
// dotenv.config({ path: './config/.env' }); // Load environment variables from .env file


// // Configure your email transport
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // or your preferred email service
//     auth: {
//         user: process.env.EMAIL_USER, // Your email address
//         pass: process.env.EMAIL_PASS  // Your email password or app-specific password
//     }
// });
// export const sendEmail = async ({ to, subject, html }) => {
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to,
//         subject,
//         html,
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log(`Email sent to ${to}`);
//     } catch (error) {
//         console.error('Error sending email:', error);
//         throw new Error('Email sending failed');
//     }
// };


// // emailService.js (or wherever you're generating the verification email)
// export const sendVerificationEmail = async (email, token) => {
//     const verificationUrl = `http://localhost:5000/api/users/verify-email?token=${token}`;

//     const message = `
//         <h1>Email Verification</h1>
//         <p>Please click the link below to verify your email:</p>
//         <a href="${verificationUrl}">Verify Email</a>
//     `;

//     // Send email logic here, assuming you're using nodemailer or any other email service
//     await sendEmail({
//         to: email,
//         subject: 'Verify your email',
//         html: message, // Email body with the correct URL
//     });
// };


// // Function to send an email about expiring items
// export const sendExpiryNotificationEmail = async (recipientEmail, expiringItems) => {
//     if (!Array.isArray(expiringItems) || expiringItems.length === 0) {
//         console.log('No expiring items to send.');
//         return; // If there are no items to send, exit early
//     }

//     // Construct the email content
//     const itemsList = expiringItems.map(item => {
//         return `
//             Item Name: ${item.itemName}
//             Batch: ${item.batch}
//             Expiry Date: ${item.expiryDate.toISOString().split('T')[0]}  // Format date
//             Quantity: ${item.quantity}
//             Purchase Rate: ${item.purchaseRate}
//             MRP: ${item.mrp}
//             GST Percentage: ${item.gstPercentage}
//             Description: ${item.description}
//             -------------------------------
//         `;
//     }).join('');

//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: recipientEmail,
//         subject: 'Expiring Items Notification',
//         text: `The following items are expiring soon:\n\n${itemsList}`
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log(`Email sent successfully to ${recipientEmail}`);
//     } catch (error) {
//         console.error('Error sending email:', error);
//     }
// };


// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// // Load environment variables from .env file
// dotenv.config({ path: './config/.env' });

// // Configure the email transport (you can use Gmail or any service)
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // You can use other email services like SendGrid, etc.
//     auth: {
//         user: process.env.EMAIL_USER,  // Your email address (for Gmail, use the full address)
//         pass: process.env.EMAIL_PASS   // Your email password or app-specific password
//     }
// });

// // Utility function to send emails
// export const sendEmail = async ({ to, subject, html }) => {
//     const mailOptions = {
//         from: process.env.EMAIL_USER, // Sender address
//         to,                          // Recipient address
//         subject,                     // Subject line
//         html,                        // HTML body content
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log(`Email sent to ${to}`);
//     } catch (error) {
//         console.error(`Error sending email to ${to}:`, error);
//         throw new Error('Email sending failed');
//     }
// };

// // Function to send email verification
// export const sendVerificationEmail = async (email, token) => {
//     const verificationUrl = `https://medicine-inventory-system.onrender.com/api/users/verify-email?token=${token}`;

//     const message = `
//         <h1>Email Verification</h1>
//         <p>Please click the link below to verify your email:</p>
//         <a href="${verificationUrl}">Verify Email</a>
//     `;

//     try {
//         await sendEmail({
//             to: email,
//             subject: 'Verify your email',
//             html: message, // Email body with the verification URL
//         });
//         console.log(`Verification email sent to ${email}`);
//     } catch (error) {
//         console.error('Error sending verification email:', error);
//     }
// };

// // Function to send email about expiring items
// export const sendExpiryNotificationEmail = async (recipientEmail, expiringItems) => {
//     if (!Array.isArray(expiringItems) || expiringItems.length === 0) {
//         console.log('No expiring items to send.');
//         return; // If there are no items to send, exit early
//     }

//     // Construct the email content for expiring items
//     const itemsList = expiringItems.map(item => {
//         return `
//             Item Name: ${item.itemName}<br/>
//             Batch: ${item.batch}<br/>
//             Expiry Date: ${item.expiryDate.toISOString().split('T')[0]}<br/> <!-- Format date -->
//             Quantity: ${item.quantity}<br/>
//             Purchase Rate: ${item.purchaseRate}<br/>
//             MRP: ${item.mrp}<br/>
//             GST Percentage: ${item.gstPercentage}<br/>
//             Description: ${item.description}<br/>
//             -------------------------------<br/>
//         `;
//     }).join('');

//     const mailOptions = {
//         from: process.env.EMAIL_USER, // Sender address
//         to: recipientEmail,           // Recipient address
//         subject: 'Expiring Items Notification',
//         html: `The following items are expiring soon:<br/><br/>${itemsList}` // HTML formatted email body
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log(`Expiring items email sent successfully to ${recipientEmail}`);
//     } catch (error) {
//         console.error(`Error sending expiring items email to ${recipientEmail}:`, error);
//     }
// };

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: './config/.env' });

// Configure the email transport (you can use Gmail or any service)
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other email services like SendGrid, etc.
    auth: {
        user: process.env.EMAIL_USER,  // Your email address (for Gmail, use the full address)
        pass: process.env.EMAIL_PASS   // Your email password or app-specific password
    }
});

// Utility function to send emails
export const sendEmail = async ({ to, subject, html }) => {
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address
        to,                          // Recipient address
        subject,                     // Subject line
        html,                        // HTML body content
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw new Error('Email sending failed');
    }
};

// Updated function to send 6-digit verification code email
export const sendVerificationCodeEmail = async (email, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification - Pharmacy Management System',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Email Verification</h1>
                    <p style="color: #f0f0f0; margin: 10px 0 0 0;">Pharmacy Management System</p>
                </div>
                
                <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Verify Your Email Address</h2>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Thank you for registering with our Pharmacy Management System. To complete your registration, please use the verification code below:
                    </p>
                    
                    <div style="background: #f8f9fa; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                        <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;">Your Verification Code:</p>
                        <h1 style="color: #667eea; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${verificationCode}
                        </h1>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                        • This code will expire in <strong>10 minutes</strong><br>
                        • Enter this code in the verification form to activate your account<br>
                        • If you didn't request this, please ignore this email
                    </p>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                            This is an automated email, please do not reply to this message.
                        </p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification code email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending verification code email to ${email}:`, error);
        throw new Error('Verification email sending failed');
    }
};

// Keep the old function for backward compatibility (but mark as deprecated)
export const sendVerificationEmail = async (email, token) => {
    console.warn('sendVerificationEmail with token is deprecated. Use sendVerificationCodeEmail instead.');
    
    const verificationUrl = `https://medicine-inventory-system.onrender.com/api/users/verify-email?token=${token}`;

    const message = `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email:</p>
        <a href="${verificationUrl}">Verify Email</a>
    `;

    try {
        await sendEmail({
            to: email,
            subject: 'Verify your email',
            html: message,
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
    }
};

// Function to send email about expiring items
export const sendExpiryNotificationEmail = async (recipientEmail, expiringItems) => {
    if (!Array.isArray(expiringItems) || expiringItems.length === 0) {
        console.log('No expiring items to send.');
        return; // If there are no items to send, exit early
    }

    // Construct the email content for expiring items
    const itemsList = expiringItems.map(item => {
        return `
            Item Name: ${item.itemName}<br/>
            Batch: ${item.batch}<br/>
            Expiry Date: ${item.expiryDate.toISOString().split('T')[0]}<br/>
            Quantity: ${item.quantity}<br/>
            Purchase Rate: ${item.purchaseRate}<br/>
            MRP: ${item.mrp}<br/>
            GST Percentage: ${item.gstPercentage}<br/>
            Description: ${item.description}<br/>
            -------------------------------<br/>
        `;
    }).join('');

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Expiring Items Notification',
        html: `The following items are expiring soon:<br/><br/>${itemsList}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Expiring items email sent successfully to ${recipientEmail}`);
    } catch (error) {
        console.error(`Error sending expiring items email to ${recipientEmail}:`, error);
    }
};