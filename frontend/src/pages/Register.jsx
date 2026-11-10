import { useState } from "react";
import API from "../api";

function Register() {
    

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (
            !form.name ||
            !form.email ||
            !form.password ||
            !form.confirmPassword
        ) {
            setError("Please fill all fields.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            await API.post("/auth/register", {
                name: form.name,
                email: form.email,
                password: form.password
            });

            setMessage(
                "Registration successful! Your account is pending admin approval."
            );

            setForm({
                name: "",
                email: "",
                password: "",
                confirmPassword: ""
            });

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Registration failed."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-header">
                    <div className="eyebrow">
                        SRR BLOCKEYVOTE
                    </div>

                    <h1>Create Account</h1>

                    <p>
                        Register as a voter to participate
                        in secure digital elections.
                    </p>
                </div>

                {message && (
                    <div className="system-message success-message">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="system-message error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="form-field">
                        <label>Full Name</label>

                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="form-field">
                        <label>Email</label>

                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-field">
                        <label>Password</label>

                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                        />
                    </div>

                    <div className="form-field">
                        <label>Confirm Password</label>

                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating Account..."
                            : "Create Account"}
                    </button>

                </form>

                <div className="auth-footer">
    Already have an account?
</div>

            </div>
        </div>
    );
}

export default Register;