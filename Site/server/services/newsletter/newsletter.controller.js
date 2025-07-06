import { sendNewsletterEmail } from './newsletter.model.js';

// פונקציה לשליחת ניוזלטר למשתמש
export const handleNewsletterSubscription = async (req, res) => {
    console.log("📩 Received request body:", req.body); // Debugging log

    const userEmail = req.body.email;
    console.log("📩 Extracted email:", userEmail); // Debugging log

    if (!userEmail) {
        console.error("❌ Error: No email provided");
        return res.status(400).json({ message: "Error: No email provided" });
    }
    try {
        // Attempt to send an email
        console.log("📨 Attempting to send email...");
        await sendNewsletterEmail(userEmail);
        console.log("✅ Email successfully sent to:", userEmail); // Debugging log

        res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
        console.error("❌ Error sending email:", error.message); // Log error details
        res.status(500).json({ message: "Error sending email", error: error.message });
    }
};

