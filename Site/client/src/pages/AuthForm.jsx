import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/AuthForm.css";

const AuthForm = ({ isLogin, isManager }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(
        isLogin
            ? isManager
                ? { password: "" }
                : { identifier: "", password: "" } // use 'identifier' for username/email login
            : { username: "", email: "", password: "", confirmPassword: "", profileImage: null }
    );
    const [errors, setErrors] = useState({});
    const [preview, setPreview] = useState(null);

    // Handle input changes
    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData((prevState) => ({ ...prevState, [id]: value }));

        if (errors[id]) {
            setErrors((prev) => ({ ...prev, [id]: "" }));
        }
    };

    // Handle file input
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData((prev) => ({ ...prev, profileImage: file }));

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Validation (registration only)
    const validateForm = () => {
        if (isLogin) return {};
        const newErrors = {};
        if (!isManager && !formData.username.trim()) newErrors.username = "Username is required";
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Valid email is required";
        if (!formData.password || formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
        setErrors(newErrors);
        return newErrors;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (!isLogin) {
            const validationErrors = validateForm();
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }
        }

        try {
            let profileImageUrl =
                formData.profile_image ||
                "https://res.cloudinary.com/dnnmhrsja/image/upload/v1700000000/default_profile.jpg";

            // If a new file is selected, upload it
            if (formData.profileImage && typeof formData.profileImage !== "string") {
                const imageData = new FormData();
                imageData.append("file", formData.profileImage);
                imageData.append("upload_preset", "your_cloudinary_preset");

                const imageResponse = await fetch("http://localhost:4000/api/upload/single", {
                    method: "POST",
                    body: imageData,
                });

                const imageResult = await imageResponse.json();

                if (imageResponse.ok && imageResult.url) {
                    profileImageUrl = imageResult.url;
                } else {
                    setErrors({ submit: "⚠️ Profile image upload failed. Try again." });
                    return;
                }
            }

            // Prepare request body
            let requestBody;
            if (isLogin) {
                if (isManager) {
                    requestBody = { username: "manager", password: formData.password };
                } else {
                    // Use identifier field (username or email)
                    const identifier = formData.identifier.trim();
                    if (!identifier) {
                        setErrors({ identifier: "Username or email is required" });
                        return;
                    }
                    const isEmail = /\S+@\S+\.\S+/.test(identifier);
                    requestBody = isEmail
                        ? { email: identifier, password: formData.password }
                        : { username: identifier, password: formData.password };
                }
            } else {
                // Register: send fields as expected by your backend
                requestBody = {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    profile_image: profileImageUrl
                };
                if (isManager) requestBody.role = "manager";
            }

            const url = isLogin
                ? "http://localhost:4000/api/auth/login"
                : "http://localhost:4000/api/auth/register";

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (response.ok && data.token) {
                localStorage.setItem("authToken", data.token);
                window.dispatchEvent(new Event("userChanged"));
                navigate("/main");
            } else {
                setErrors({ submit: data.error || data.message || "An error occurred. Try again." });
            }
        } catch (error) {
            setErrors({ submit: "An error occurred. Please try again." });
        }
    };

    return (
        <div className={`authContainer ${isLogin ? "login" : "signup"}`}>
            <form className="authForm" onSubmit={handleSubmit}>
                <h2 className="authTitle">
                    {isManager ? "Manager Sign In" : isLogin ? "Welcome Back" : "Create an Account"}
                </h2>
                {errors.submit && <p className="error">{errors.submit}</p>}

                {/* Username or Email input for login */}
                {isLogin && !isManager && (
                    <div className="formGroup">
                        <label htmlFor="identifier">Username or Email</label>
                        <input
                            type="text"
                            id="identifier"
                            placeholder="Enter your username or email"
                            value={formData.identifier || ""}
                            className={errors.identifier ? "inputError" : ""}
                            onChange={handleChange}
                            required
                        />
                        {errors.identifier && <p className="error">{errors.identifier}</p>}
                    </div>
                )}

                {/* Username input for register */}
                {!isLogin && !isManager && (
                    <div className="formGroup">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Enter your username"
                            value={formData.username}
                            className={errors.username ? "inputError" : ""}
                            onChange={handleChange}
                            required
                        />
                        {errors.username && <p className="error">{errors.username}</p>}
                    </div>
                )}

                {/* Email input for register */}
                {!isLogin && (
                    <div className="formGroup">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        {errors.email && <p className="error">{errors.email}</p>}
                    </div>
                )}

                {/* Profile image input for register */}
                {!isLogin && (
                    <div className="formGroup">
                        <label htmlFor="profileImage">Profile Picture (Optional)</label>
                        <input type="file" id="profileImage" accept="image/*" onChange={handleFileChange} />
                        {preview && <img src={preview} alt="Preview" className="previewImage" />}
                    </div>
                )}

                {/* Password */}
                <div className="formGroup">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    {errors.password && <p className="error">{errors.password}</p>}
                </div>

                {/* Confirm password for register */}
                {!isLogin && (
                    <div className="formGroup">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                        {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}
                    </div>
                )}

                <button type="submit" className="authButton">{isLogin ? "Login" : "Sign Up"}</button>

                {isLogin && (
                    <p className="switchAuth">
                        No account? <span onClick={() => navigate("/signup")} className="switchLink">Register here</span><br />
                        Manager? <span onClick={() => navigate("/managersignin")} className="switchLink">Sign in here</span>
                    </p>
                )}
            </form>
        </div>
    );
};

export default AuthForm;
