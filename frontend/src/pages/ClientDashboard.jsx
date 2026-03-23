import useApi from "../hooks/useApi";
import http from "../api/http";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";

const ClientDashboard = () => {
  const dashboard = useApi(async () => (await http.get("/client/dashboard")).data, []);

  const active = dashboard.data?.activeSubscription;

  return (
    <div className="page-grid">
      <header className="hero-card card">
        <h2>Client Portal</h2>
        <p>Review your subscription details, expiration dates, and streaming server status.</p>
      </header>

      <section className="stats-grid">
        <StatCard title="Current Plan" value={active?.packageId?.name || "No active plan"} accent="var(--accent-1)" />
        <StatCard
          title="Subscription Status"
          value={active?.status || "inactive"}
          accent={active ? "var(--accent-2)" : "var(--danger)"}
        />
        <StatCard
          title="Expires"
          value={active?.endDate ? new Date(active.endDate).toLocaleDateString() : "-"}
          accent="var(--accent-3)"
        />
      </section>

      <section className="card">
        <h3>All Subscriptions</h3>
        <DataTable
          columns={[
            { key: "package", label: "Package", render: (row) => row.packageId?.name || "-" },
            { key: "status", label: "Status" },
            { key: "startDate", label: "Start", render: (row) => new Date(row.startDate).toLocaleDateString() },
            { key: "endDate", label: "End", render: (row) => new Date(row.endDate).toLocaleDateString() },
            { key: "server", label: "Server", render: (row) => row.serverId?.name || "N/A" }
          ]}
          rows={dashboard.data?.subscriptions || []}
        />
      </section>
    </div>
  );
};

export default ClientDashboard;
