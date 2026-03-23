import { useMemo, useState } from "react";
import http from "../../api/http";
import useApi from "../../hooks/useApi";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import ChartCard from "../../components/ChartCard";

const ResellerDashboard = () => {
  // Combined page state powers client and subscription operations.
  const [clientForm, setClientForm] = useState({ fullName: "", email: "", password: "" });
  const [subscriptionForm, setSubscriptionForm] = useState({ clientId: "", packageId: "", isTrial: false });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");

  const dashboard = useApi(async () => (await http.get("/reseller/dashboard")).data, []);
  const clients = useApi(async () => (await http.get(`/reseller/clients?q=${encodeURIComponent(search)}`)).data, [search, message]);
  const packages = useApi(async () => (await http.get("/reseller/packages")).data, []);
  const subscriptions = useApi(
    async () => (await http.get(`/reseller/subscriptions${statusFilter ? `?status=${statusFilter}` : ""}`)).data,
    [statusFilter, message]
  );

  const chartData = useMemo(() => {
    // Group subscriptions by package for a quick portfolio overview.
    const map = {};
    (subscriptions.data || []).forEach((sub) => {
      const name = sub.packageId?.name || "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [subscriptions.data]);

  const createClient = async (event) => {
    event.preventDefault();
    await http.post("/reseller/clients", clientForm);
    setClientForm({ fullName: "", email: "", password: "" });
    setMessage("Client created");
  };

  const assignSubscription = async (event) => {
    event.preventDefault();
    await http.post("/reseller/subscriptions", subscriptionForm);
    setSubscriptionForm({ clientId: "", packageId: "", isTrial: false });
    setMessage("Subscription assigned");
  };

  const renewSubscription = async (id) => {
    await http.post(`/reseller/subscriptions/${id}/renew`);
    setMessage("Subscription renewed");
  };

  const downloadReport = async (format, reportType) => {
    const { data } = await http.get(`/reseller/reports?format=${format}&reportType=${reportType}`, {
      responseType: "blob"
    });

    const blob = new Blob([data], {
      type: format === "pdf" ? "application/pdf" : "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-grid">
      <header className="hero-card card">
        <h2>Reseller Operations Desk</h2>
        <p>Manage client accounts, assign subscriptions, and monitor your sales and credit balance.</p>
      </header>

      <section className="stats-grid">
        <StatCard title="Clients" value={dashboard.data?.metrics?.totalClients || 0} accent="var(--accent-2)" />
        <StatCard title="Revenue" value={`$${dashboard.data?.metrics?.revenue || 0}`} accent="var(--accent-3)" />
        <StatCard title="Remaining Credits" value={dashboard.data?.metrics?.remainingCredits || 0} accent="var(--brand)" />
        <StatCard
          title="Active Subscriptions"
          value={dashboard.data?.metrics?.activeSubscriptions || 0}
          accent="var(--accent-1)"
        />
      </section>

      <ChartCard title="Subscriptions by Package" data={chartData} />

      <section className="split-grid">
        <article className="card">
          <h3>Create Client</h3>
          <form className="form-grid" onSubmit={createClient}>
            <input
              placeholder="Full name"
              value={clientForm.fullName}
              onChange={(e) => setClientForm((old) => ({ ...old, fullName: e.target.value }))}
              required
            />
            <input
              placeholder="Email"
              type="email"
              value={clientForm.email}
              onChange={(e) => setClientForm((old) => ({ ...old, email: e.target.value }))}
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={clientForm.password}
              onChange={(e) => setClientForm((old) => ({ ...old, password: e.target.value }))}
              required
            />
            <button type="submit">Create Client</button>
          </form>
        </article>

        <article className="card">
          <h3>Assign Subscription / Trial</h3>
          <form className="form-grid" onSubmit={assignSubscription}>
            <select
              value={subscriptionForm.clientId}
              onChange={(e) => setSubscriptionForm((old) => ({ ...old, clientId: e.target.value }))}
              required
            >
              <option value="">Select client</option>
              {(clients.data || []).map((client) => (
                <option key={client._id} value={client._id}>
                  {client.fullName}
                </option>
              ))}
            </select>

            <select
              value={subscriptionForm.packageId}
              onChange={(e) => setSubscriptionForm((old) => ({ ...old, packageId: e.target.value }))}
              required
            >
              <option value="">Select package</option>
              {(packages.data || []).map((pack) => (
                <option key={pack._id} value={pack._id}>
                  {pack.name} (${pack.price})
                </option>
              ))}
            </select>

            <label className="checkbox-row" htmlFor="isTrial">
              <input
                id="isTrial"
                type="checkbox"
                checked={subscriptionForm.isTrial}
                onChange={(e) => setSubscriptionForm((old) => ({ ...old, isTrial: e.target.checked }))}
              />
              Offer free trial (3 days)
            </label>

            <button type="submit">Assign Subscription</button>
          </form>
        </article>
      </section>

      <section className="card">
        <h3>Client List</h3>
        <input placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
        <DataTable
          columns={[
            { key: "fullName", label: "Name" },
            { key: "email", label: "Email" },
            { key: "lastLoginAt", label: "Last Login", render: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never") },
            { key: "lastLoginDevice", label: "Device" }
          ]}
          rows={clients.data || []}
        />
      </section>

      <section className="card">
        <h3>Subscriptions</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <DataTable
          columns={[
            { key: "client", label: "Client", render: (row) => row.clientId?.fullName || "-" },
            { key: "package", label: "Package", render: (row) => row.packageId?.name || "-" },
            { key: "status", label: "Status" },
            { key: "endDate", label: "Ends", render: (row) => new Date(row.endDate).toLocaleDateString() },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <button type="button" onClick={() => renewSubscription(row._id)}>
                  Renew
                </button>
              )
            }
          ]}
          rows={subscriptions.data || []}
        />
      </section>

      <section className="card split-actions">
        <h3>Reports</h3>
        <div>
          <button type="button" onClick={() => downloadReport("csv", "sales")}>Sales CSV</button>
          <button type="button" onClick={() => downloadReport("pdf", "sales")}>Sales PDF</button>
          <button type="button" onClick={() => downloadReport("csv", "clients")}>Clients CSV</button>
          <button type="button" onClick={() => downloadReport("pdf", "clients")}>Clients PDF</button>
        </div>
        {message ? <p className="success-text">{message}</p> : null}
      </section>
    </div>
  );
};

export default ResellerDashboard;
