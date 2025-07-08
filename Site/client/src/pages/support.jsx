import React, { useState } from 'react';
import '../assets/styles/support.css';

const Support = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Here you would integrate with EmailJS or your backend API to send the email
    console.log("Form submitted:", formData);

    // Reset form and show success
    setFormData({ name: "", email: "", message: "" });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="customer-support">
      <h1>Contact Customer Support</h1>
      
      <p>
        We’re here to help!</p><p> Please fill out the form below or reach us through the following:
      </p>

      <h2>Email Support</h2>
      <p>
        <a href="mailto:pathmakers88@gmail.com">pathmakers88@gmail.com</a>
      </p>

      <h2>Phone Support</h2>
      <p>
        +1 234 567 890 (Mon-Fri, 9 AM - 6 PM)
      </p>

      <h2>Send us a Message</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          name="name" 
          placeholder="Your Name" 
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input 
          type="email" 
          name="email" 
          placeholder="Your Email" 
          value={formData.email}
          onChange={handleChange}
          required
        />
        <textarea 
          name="message" 
          placeholder="Your Message" 
          rows="5"
          value={formData.message}
          onChange={handleChange}
          required
        ></textarea>
        <button type="submit">Send Message</button>
      </form>

      {submitted && (
        <div className="success-message">
          ✅ Your message has been sent! We will get back to you shortly.
        </div>
      )}

      <h2>Mailing Address</h2>
      <p>
        Pathmakers<br />
        123 Path Street,<br />
        Cityname, State, ZIPCODE<br />
        Country
      </p>
    </div>
  );
};

export default Support;
