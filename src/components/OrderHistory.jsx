import React, { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle2, ChevronRight, ShoppingBag, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { getLocalOrders } from '../utils/localStorage.js';
import { getOrderSession } from '../utils/orderSession.js';
import { supabase } from '../lib/supabase.js';

const OrderHistory = ({ guestId, user = null }) => {
    const { t, label } = useLanguage();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [needsRecovery, setNeedsRecovery] = useState(false);
    const [showRecoveryForm, setShowRecoveryForm] = useState(false);
    const [recoveryOrderNumber, setRecoveryOrderNumber] = useState('');
    const [recoveryExplanation, setRecoveryExplanation] = useState('');
    const [recoveryMessage, setRecoveryMessage] = useState('');
    const [recoverySubmitting, setRecoverySubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchOrders = async () => {
            if (!guestId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const session = await getOrderSession();
                const apiUrl = import.meta.env.VITE_API_URL || '';
                const localIds = getLocalOrders();
                const fetchUrl = localIds.length > 0 
                  ? `${apiUrl}/api/orders/user/${session.guestId}?ids=${localIds.slice(0, 50).join(',')}`
                  : `${apiUrl}/api/orders/user/${session.guestId}`;

                const response = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${session.accessToken}` } });
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                if (!cancelled) {
                    setOrders(data);
                    setNeedsRecovery(localIds.some((id) => !data.some((order) => String(order.id) === String(id))));
                }
            } catch (err) {
                console.error('❌ Order history fetch failed:', err);
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchOrders();
        return () => { cancelled = true; };
    }, [guestId]);

    const submitRecoveryRequest = async (event) => {
        event.preventDefault();
        if (!user || recoverySubmitting) return;
        setRecoverySubmitting(true);
        setRecoveryMessage('');
        try {
            const { data } = await supabase?.auth?.getSession?.() || { data: {} };
            const token = data?.session?.access_token;
            if (!token) throw new Error('Please sign in again before requesting store verification.');
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/orders/recovery-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ orderNumber: recoveryOrderNumber, explanation: recoveryExplanation }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || payload.error || 'Could not send the recovery request.');
            setRecoveryMessage('Your request was sent to the store team for verification.');
            setRecoveryOrderNumber('');
            setRecoveryExplanation('');
        } catch (error) {
            setRecoveryMessage(error.message || 'Could not send the recovery request.');
        } finally {
            setRecoverySubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'processing': return <Clock size={16} className="text-blue-500" />;
            default: return <Package size={16} className="text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) return <div role="alert">{label('common.error', 'Error')}: {error}</div>;

    if (orders.length === 0) {
        return (
            <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-3xl">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag size={20} className="text-gray-400" />
                </div>
                <h4 className="text-gray-900 font-medium mb-1">
                    {label('profile.noOrdersYet', 'No orders yet')}
                </h4>
                <p className="text-gray-500 text-sm">
                    {needsRecovery
                        ? label('profile.orderHistoryRecovery', 'Some older orders need store verification. Contact the store with your order number to recover access.')
                        : label('profile.ordersWillShowHere', 'Your recent purchases will appear here.')}
                </p>
                {needsRecovery && user && (
                    <div className="mt-4 text-left">
                        {!showRecoveryForm ? (
                            <button type="button" className="udp-btn udp-btn-secondary" onClick={() => setShowRecoveryForm(true)}>
                                Request store verification
                            </button>
                        ) : (
                            <form onSubmit={submitRecoveryRequest} className="space-y-2" aria-label="Request store verification">
                                <label className="block text-sm font-medium" htmlFor="recovery-order-number">Order number</label>
                                <input id="recovery-order-number" inputMode="numeric" pattern="[0-9]+" required value={recoveryOrderNumber} onChange={(event) => setRecoveryOrderNumber(event.target.value)} className="form-input" />
                                <label className="block text-sm font-medium" htmlFor="recovery-explanation">Short explanation</label>
                                <textarea id="recovery-explanation" maxLength={500} required value={recoveryExplanation} onChange={(event) => setRecoveryExplanation(event.target.value)} className="form-input" rows={3} />
                                <button type="submit" className="udp-btn udp-btn-primary" disabled={recoverySubmitting}>{recoverySubmitting ? 'Sending…' : 'Send request'}</button>
                                {recoveryMessage && <p role="status" className="text-sm">{recoveryMessage}</p>}
                            </form>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {needsRecovery && <p role="status">{label('profile.orderHistoryRecovery', 'Some older orders need store verification. Contact the store with your order number to recover access.')}</p>}
            <h4 className="text-sm font-semibold text-gray-900 px-1 mb-2 flex items-center gap-2">
                <ShoppingBag size={14} />
                {label('profile.recentOrders', 'Recent Orders')}
            </h4>
            {orders.map((order) => (
                <div 
                    key={order.id}
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-gray-200 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            {getStatusIcon(order.status)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">#{order.id}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    order.status === 'completed' ? 'bg-green-50 text-green-600' :
                                    order.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {new Date(order.date_created).toLocaleDateString()} • {order.total} {order.currency}
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                </div>
            ))}
        </div>
    );
};

export default OrderHistory;
