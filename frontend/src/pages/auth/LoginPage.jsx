import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({
        ...form,
        deviceInfo: navigator.userAgent.slice(0, 80)
      });

      navigate(`/${result.user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>IPTV Reseller System</h1>
        <p>Admin, reseller, and client access in one secure dashboard.</p>

        <form onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((old) => ({ ...old, email: e.target.value }))}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((old) => ({ ...old, password: e.target.value }))}
            required
          />

          <label htmlFor="otp">2FA OTP (admin only)</label>
          <input
            id="otp"
            type="text"
            value={form.otp}
            onChange={(e) => setForm((old) => ({ ...old, otp: e.target.value }))}
            placeholder="Optional for non-admin users"
          />

          {error ? <div className="error-box">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
