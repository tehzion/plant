import React, { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle2, ChevronRight, ShoppingBag, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { getLocalOrders } from '../utils/localStorage.js';

const OrderHistory = ({ guestId }) => {
    const { t, label } = useLanguage();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!guestId) {
                setLoading(false);
                return;
            }

            try {
                const localIds = getLocalOrders();
                const fetchUrl = localIds.length > 0 
                  ? `/api/orders/user/${guestId}?ids=${localIds.join(',')}`
                  : `/api/orders/user/${guestId}`;

                const response = await fetch(fetchUrl);
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                setOrders(data);
            } catch (err) {
                console.error('❌ Order history fetch failed:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [guestId]);

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
                    {label('profile.ordersWillShowHere', 'Your recent purchases will appear here.')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
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
