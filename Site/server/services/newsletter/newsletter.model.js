import nodemailer from 'nodemailer';

export const sendNewsletterEmail = async (email) => {
    try {
        // Ensure environment variables are set
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Missing EMAIL_USER or EMAIL_PASS environment variable');
        }

        console.log("🚀 Preparing email transport...");

        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or use SMTP settings if not Gmail
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Newsletter Subscription",
            text: "Thank you for subscribing to our newsletter!"
        };

        console.log("📨 Sending email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully!", info.response);

    } catch (error) {
        console.error("❌ Error sending email:", error.message);
    }
};



