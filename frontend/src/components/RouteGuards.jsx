import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const disableSignIn = import.meta.env.VITE_DISABLE_SIGNIN !== "false";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (disableSignIn) return children;
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const RoleRoute = ({ role, children }) => {
  const { user, loading } = useAuth();
  if (disableSignIn) return children;
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
};
