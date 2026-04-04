import React, { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const money = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

export default function NightMess() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        api.get('/mess/night-menu'),
        api.get('/mess/night-order/my'),
      ]);
      setItems(itemsRes.items || []);
      setOrders(ordersRes.orders || []);
    } catch {
      toast.error('Failed to load night mess');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const cartItems = useMemo(() => {
    return items
      .filter((item) => (cart[item._id] || 0) > 0)
      .map((item) => ({ ...item, qty: cart[item._id] }));
  }, [items, cart]);

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const updateQty = (itemId, nextQty) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: Math.max(0, nextQty),
    }));
  };

  const placeOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Add at least one night mess item');
      return;
    }

    setPlacingOrder(true);
    try {
      await api.post('/mess/night-order', {
        items: cartItems.map((item) => ({ item_id: item._id, qty: item.qty })),
      });
      toast.success('Night mess ordered and paid in advance');
      setCart({});
      fetchData();
    } catch (error) {
      toast.error(error?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Night Mess</h1>
        <p>Order available late-night items from your room, pay in advance, and collect once the mess marks your order ready.</p>
      </div>

      <div className="alert-panel info" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700 }}>Refund and fine policy</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
          If an item goes out of stock or cannot be prepared, a full refund is issued. If your order is ready but you do not collect it, 25% is deducted as a pickup fine and the rest is refunded.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Tonight&apos;s Available Items</div>
          {loading ? <div className="skeleton" style={{ height: 240 }} /> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((item) => (
                <div key={item._id} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{item.description}</div>
                      <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: 6 }}>
                        {item.category} · {item.prep_time_mins} mins · {item.available_qty} left
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{money(item.price)}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item._id, (cart[item._id] || 0) - 1)}>-</button>
                        <span style={{ minWidth: 20, textAlign: 'center' }}>{cart[item._id] || 0}</span>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!item.is_available || item.available_qty <= (cart[item._id] || 0)}
                          onClick={() => updateQty(item._id, (cart[item._id] || 0) + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 20, alignSelf: 'start' }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Cart & Payment</div>
            {cartItems.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No items added yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {cartItems.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span>{item.name} x {item.qty}</span>
                    <span>{money(item.price * item.qty)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Pay now</span>
                  <span>{money(totalAmount)}</span>
                </div>
                <button className="btn btn-primary" onClick={placeOrder} disabled={placingOrder}>
                  {placingOrder ? 'Processing...' : 'Pay & Place Order'}
                </button>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>My Night Orders</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {orders.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No night mess orders yet.</div>}
              {orders.map((order) => (
                <div key={order._id} style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.36)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{order.order_no}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {order.items?.map((item) => `${item.name} x${item.qty}`).join(', ')}
                      </div>
                    </div>
                    <span className={`badge ${order.status === 'Ready' ? 'badge-success' : order.status === 'OutOfStock' || order.status === 'NotReady' ? 'badge-danger' : order.status === 'NotCollected' ? 'badge-warning' : 'badge-info'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Paid: {money(order.total_amount)}</span>
                    <span>{order.payment_status}</span>
                  </div>
                  {(order.refund_amount > 0 || order.fine_amount > 0 || order.note) && (
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#93c5fd' }}>
                      {order.refund_amount > 0 && <div>Refund: {money(order.refund_amount)}</div>}
                      {order.fine_amount > 0 && <div>Fine: {money(order.fine_amount)}</div>}
                      {order.note && <div>{order.note}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
