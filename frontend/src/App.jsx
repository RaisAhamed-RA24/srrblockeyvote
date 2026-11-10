import { useState } from "react";
import API from "./api";
import AdminDashboard from "./pages/AdminDashboard";
import VoterDashboard from "./pages/VoterDashboard";
import Register from "./pages/Register";

function App() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const [showRegister, setShowRegister] = useState(false);

    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user")) || null
    );

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await API.post("/auth/login", {
                email: email.trim(),
                password
            });

            localStorage.setItem(
                "token",
                response.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            setUser(response.data.user);
            setMessage("Login successful!");

        } catch (error) {
            console.log(
                "LOGIN ERROR:",
                error.response?.data
            );

            setMessage(
                error.response?.data?.message ||
                "Login failed"
            );
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setEmail("");
        setPassword("");
        setMessage("");
    };

    /*
     * If user is logged in
     */
    if (user) {
        return (
            <div>
                <h1>SRR BlockeyVote</h1>

                <p>
                    Welcome, <strong>{user.name}</strong>
                </p>

                <p>
                    Role: <strong>{user.role}</strong>
                </p>

                <hr />

                {/* ADMIN DASHBOARD */}
                {user.role === "ADMIN" && (
                    <AdminDashboard />
                )}

                {/* VOTER DASHBOARD */}
                {user.role === "VOTER" && (
                    <VoterDashboard />
                )}

                <hr />

                <button onClick={handleLogout}>
                    Logout
                </button>
            </div>
        );
    }

    /*
     * Registration page
     */
    if (showRegister) {
        return (
            <div>
                <Register />

                <div
                    style={{
                        textAlign: "center",
                        marginTop: "15px"
                    }}
                >
                    <button
                        onClick={() => {
                            setShowRegister(false);
                            setMessage("");
                        }}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    /*
     * Login page
     */
    return (
        <div>
            <h1>SRR BlockeyVote</h1>

            <h2>Login</h2>

            <form onSubmit={handleLogin}>

                <div>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />
                </div>

                <br />

                <div>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                    />
                </div>

                <br />

                <button type="submit">
                    Login
                </button>

            </form>

            {message && (
                <p>{message}</p>
            )}

            <hr />

            <p>
                New member?
            </p>

            <button
                onClick={() => {
                    setShowRegister(true);
                    setMessage("");
                }}
            >
                Create an account
            </button>
        </div>
    );
}

export default App;