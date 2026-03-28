let notificationHandler = null;

export const registerNotificationHandler = (handler) => {
    notificationHandler = handler;
    return () => {
        if (notificationHandler === handler) {
            notificationHandler = null;
        }
    };
};

export const emitNotification = (notification) => {
    if (typeof notificationHandler === 'function') {
        return notificationHandler(notification);
    }

    if (typeof window !== 'undefined') {
        console.warn('Notification handler is not ready yet.', notification);
    }

    return null;
};

export const showToast = (message, type = 'success', duration = 2500, extra = {}) =>
    emitNotification({
        message,
        type,
        duration,
        ...extra,
    });
