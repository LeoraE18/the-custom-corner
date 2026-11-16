import { useCallback, useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";
import { apiFetch } from "./api";

type OrderItem = {
  id?: string;
  productId?: number;
  name?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
  font?: string;
  vinylColor?: string;
  personalization?: string;
};

type Order = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  fulfillment: string;
  status: string;
  createdAt: string;
};

const statuses = ["New", "Confirmed", "Ready for pickup", "Completed", "Cancelled"];
const money = new Intl.NumberFormat("en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });

function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All orders");
  const [updating, setUpdating] = useState<number | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchOrders = useCallback(async () => {
    const response = await apiFetch("/api/orders");
    if (response.status === 401) {
      window.location.replace("/admin/login");
      throw new Error("Administrator login required.");
    }
    if (!response.ok) throw new Error("The orders service could not be reached.");
    const data = await response.json();
    return Array.isArray(data.orders) ? data.orders as Order[] : [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((loadedOrders) => { if (active) { setOrders(loadedOrders); setError(""); } })
      .catch(() => { if (active) setError("We couldn’t load orders. Make sure the backend is running, then try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrders]);

  const refreshOrders = () => {
    setLoading(true);
    setError("");
    fetchOrders()
      .then(setOrders)
      .catch(() => setError("We couldn’t load orders. Make sure the backend is running, then try again."))
      .finally(() => setLoading(false));
  };

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "All orders" || order.status === statusFilter;
      const matchesQuery = !normalizedQuery || [
        String(order.id), order.customerName, order.customerPhone, order.customerEmail,
        ...order.items.map((item) => `${item.name ?? ""} ${item.personalization ?? ""}`),
      ].join(" ").toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter]);

  const openOrders = orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)).length;
  const newOrders = orders.filter((order) => order.status === "New").length;
  const totalRevenue = orders.filter((order) => order.status !== "Cancelled").reduce((total, order) => total + Number(order.subtotal || 0), 0);

  const updateStatus = async (orderId: number, status: string) => {
    setUpdating(orderId);
    setError("");
    try {
      const response = await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.order) throw new Error("Status update failed.");
      setOrders((current) => current.map((order) => order.id === orderId ? data.order : order));
    } catch {
      setError(`Couldn’t update order #${orderId}. Please try again.`);
    } finally {
      setUpdating(null);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    setError("");
    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed.");
      window.location.replace("/admin/login");
    } catch {
      setError("We couldn’t end your session. Please try again.");
      setLoggingOut(false);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IL", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="The Custom Corner storefront">
          <span className="admin-brand-mark">CC</span>
          <span>The <b>Custom</b> Corner<small>PERSONALIZED GOODS</small></span>
        </a>
        <div className="admin-sidebar-label">WORKSPACE</div>
        <a className="admin-nav-item active" href="#orders"><span aria-hidden="true">▦</span> Orders <span className="admin-nav-count">{orders.length}</span></a>
        <div className="admin-sidebar-note"><span className="admin-live-dot" /> Store dashboard</div>
        <a className="admin-store-link" href="/">← Back to storefront</a>
        <button className="admin-logout-link" type="button" onClick={() => void logout()} disabled={loggingOut}>
          {loggingOut ? "Signing out…" : "↪ Sign out"}
        </button>
      </aside>

      <main className="admin-main" id="orders">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">The Custom Corner <span>/</span> Orders</div>
          <a className="admin-view-store" href="/">View storefront <span aria-hidden="true">↗</span></a>
        </header>

        <section className="admin-content">
          <div className="admin-page-heading">
            <div>
              <div className="admin-eyebrow">YOUR SHOP, AT A GLANCE</div>
              <h1>Orders</h1>
              <p>Keep every thoughtful, personalized order moving.</p>
            </div>
            <button className="admin-refresh" onClick={refreshOrders} disabled={loading} type="button">
              <span aria-hidden="true">↻</span> Refresh
            </button>
          </div>

          <div className="admin-stats">
            <article className="admin-stat-card"><span className="admin-stat-icon lavender">▤</span><div><span>Total orders</span><strong>{orders.length}</strong></div><small>All time</small></article>
            <article className="admin-stat-card"><span className="admin-stat-icon peach">◷</span><div><span>Needs attention</span><strong>{openOrders}</strong></div><small>{newOrders} new</small></article>
            <article className="admin-stat-card"><span className="admin-stat-icon sage">₪</span><div><span>Order value</span><strong>{money.format(totalRevenue)}</strong></div><small>Excludes cancelled</small></article>
          </div>

          {error && <div className="admin-alert" role="alert">{error}</div>}

          <section className="admin-orders-panel">
            <div className="admin-panel-heading">
              <div><h2>Customer orders</h2><p>Order items and personalization details are shown below.</p></div>
              <div className="admin-order-tools">
                <label className="admin-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" aria-label="Search orders" /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by order status">
                  <option>All orders</option>{statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
            </div>

            {loading ? <div className="admin-empty"><span className="admin-loader" />Loading your orders…</div> : filteredOrders.length === 0 ? (
              <div className="admin-empty"><span className="admin-empty-icon">♡</span><strong>{orders.length ? "No matching orders" : "Your orders will appear here"}</strong><p>{orders.length ? "Try another search or status filter." : "When a customer places an order, you’ll find it here."}</p></div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-orders-table">
                  <thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th><span className="admin-sr-only">Details</span></th></tr></thead>
                  <tbody>{filteredOrders.map((order) => {
                    const expanded = expandedOrder === order.id;
                    return <FragmentRow key={order.id} order={order} expanded={expanded} updating={updating === order.id} onToggle={() => setExpandedOrder(expanded ? null : order.id)} onStatus={(status) => void updateStatus(order.id, status)} formatDate={formatDate} />;
                  })}</tbody>
                </table>
              </div>
            )}
            {!loading && filteredOrders.length > 0 && <div className="admin-table-footer">Showing {filteredOrders.length} of {orders.length} orders</div>}
          </section>
          <footer className="admin-footer">Made with care · The Custom Corner</footer>
        </section>
      </main>
    </div>
  );
}

function FragmentRow({ order, expanded, updating, onToggle, onStatus, formatDate }: {
  order: Order; expanded: boolean; updating: boolean; onToggle: () => void;
  onStatus: (status: string) => void; formatDate: (value: string) => string;
}) {
  const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  return <>
    <tr className="admin-order-row">
      <td><button className="admin-order-number" type="button" onClick={onToggle}>#{order.id.toString().padStart(4, "0")}</button></td>
      <td><div className="admin-customer"><span className="admin-avatar">{order.customerName?.trim().charAt(0).toUpperCase() || "?"}</span><span><b>{order.customerName}</b><small>{order.customerEmail || order.customerPhone}</small></span></div></td>
      <td><b>{itemCount} {itemCount === 1 ? "item" : "items"}</b><small className="admin-item-summary">{order.items.map((item) => item.name || "Custom item").join(", ")}</small></td>
      <td className="admin-date">{formatDate(order.createdAt)}</td>
      <td className="admin-total">{money.format(Number(order.subtotal || 0))}</td>
      <td><select className={`admin-status status-${order.status.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`} value={order.status} onChange={(event) => onStatus(event.target.value)} disabled={updating} aria-label={`Status for order ${order.id}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
      <td><button className={`admin-expand ${expanded ? "is-open" : ""}`} type="button" onClick={onToggle} aria-label={`${expanded ? "Hide" : "Show"} details for order ${order.id}`}>⌄</button></td>
    </tr>
    {expanded && <tr className="admin-detail-row"><td colSpan={7}>
      <div className="admin-order-details">
        <div className="admin-detail-heading"><div><span className="admin-eyebrow">ORDER DETAILS</span><h3>Order #{order.id.toString().padStart(4, "0")}</h3></div><span className="admin-fulfillment">{order.fulfillment || "Store Pickup"}</span></div>
        <div className="admin-detail-grid">
          <section><h4>Customer</h4><p>{order.customerName}</p><p>{order.customerPhone}</p>{order.customerEmail && <p>{order.customerEmail}</p>}</section>
          <section><h4>Personalized items</h4>{order.items.map((item, index) => <article className="admin-detail-item" key={item.id || `${item.productId}-${index}`}>
            <div className="admin-item-title"><b>{item.name || "Custom item"}</b><span>{Number(item.quantity || 1)} × {money.format(Number(item.price || 0))}</span></div>
            <div className="admin-personalization">{[
              item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`, item.font && `Font: ${item.font}`, item.vinylColor && `Vinyl: ${item.vinylColor}`, item.personalization && `Text: “${item.personalization}”`,
            ].filter(Boolean).map((detail) => <span key={detail}>{detail}</span>)}</div>
          </article>)}</section>
        </div>
      </div>
    </td></tr>}
  </>;
}

export default AdminDashboard;
