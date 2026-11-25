import { useEffect, useState } from 'react';

/**
 * True once a newer version of the app has taken over this open page
 * (the service worker updates itself; a reload is what shows the new code).
 * The first install on a fresh visit does not count: there was nothing older.
 */
export const useAppUpdateReady = () => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;
        if (!sw?.addEventListener) return undefined;
        const hadController = Boolean(sw.controller);
        const onChange = () => { if (hadController) setReady(true); };
        sw.addEventListener('controllerchange', onChange);
        return () => sw.removeEventListener('controllerchange', onChange);
    }, []);

    return ready;
};

export default useAppUpdateReady;
