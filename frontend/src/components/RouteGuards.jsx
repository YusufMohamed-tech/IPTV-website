import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const disableSignIn = import.meta.env.VITE_DISABLE_SIGNIN !== "false";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loader">Loading...</div>;

  if (disableSignIn) {
    // If sign-in is disabled, we expect auto-login to succeed.
    // If user is present, render children.
    if (user) return children;
    // Fallback if something went wrong despite disabling sign-in
    return <div className="error-screen">Auto-login failed. Please check configuration.</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const RoleRoute = ({ role, children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loader">Loading...</div>;

  if (disableSignIn) {
    if (user) {
      // If user has the wrong role, redirect to their role's dashboard
      if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
      return children;
    }
    return <div className="error-screen">Auto-login failed. Please check configuration.</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
};
