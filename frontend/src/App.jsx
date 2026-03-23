import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import AppLayout from "./layouts/AppLayout";
import { ProtectedRoute, RoleRoute } from "./components/RouteGuards";

const disableSignIn = import.meta.env.VITE_DISABLE_SIGNIN === "true";

const App = () => (
  <Routes>
    <Route path="/login" element={disableSignIn ? <Navigate to="/admin" replace /> : <LoginPage />} />

    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <RoleRoute role="admin">
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </RoleRoute>
        </ProtectedRoute>
      }
    />

    <Route
      path="/reseller"
      element={
        <ProtectedRoute>
          <RoleRoute role="reseller">
            <AppLayout>
              <ResellerDashboard />
            </AppLayout>
          </RoleRoute>
        </ProtectedRoute>
      }
    />

    <Route
      path="/client"
      element={
        <ProtectedRoute>
          <RoleRoute role="client">
            <AppLayout>
              <ClientDashboard />
            </AppLayout>
          </RoleRoute>
        </ProtectedRoute>
      }
    />

    <Route path="*" element={<Navigate to={disableSignIn ? "/admin" : "/login"} replace />} />
  </Routes>
);

export default App;
