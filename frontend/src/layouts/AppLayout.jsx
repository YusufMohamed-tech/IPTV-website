import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  const items =
    user?.role === "admin"
      ? [{ to: "/admin", label: "Admin Panel" }]
      : user?.role === "reseller"
      ? [{ to: "/reseller", label: "Reseller Panel" }]
      : [{ to: "/client", label: "Client Portal" }];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>NeonStream OS</h1>
        <p>IPTV Reseller System</p>
        <nav>
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname.startsWith(item.to) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
};

export default AppLayout;
