import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import AppLayout from "./layouts/AppLayout";
import { ProtectedRoute, RoleRoute } from "./components/RouteGuards";

const App = () => (
  <Routes>
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

    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>
);

export default App;
