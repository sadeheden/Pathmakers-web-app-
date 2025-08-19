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
    subject: "Welcome to PathMakers 🌍",
    text: `Hey traveler! ✈️

    Thanks for subscribing to our newsletter 🎉  
    You’re now part of the PathMakers family!  

    From now on, you’ll be the first to know about:
    ✨ Exclusive travel deals and discounts  
    🌴 Inspiring destinations and hidden gems  
    🛎️ Smart tips to make your trip smoother  
    🎒 Ready-to-go itineraries you can just pack and follow  

    Get ready — a lot of exciting trips and offers are on the way! 🚀  

    Happy travels,  
    The PathMakers Team 🌎`
    };


        console.log("📨 Sending email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully!", info.response);

    } catch (error) {
        console.error("❌ Error sending email:", error.message);
    }
};



