
// A simple wrapper to simulate Android Notifications in the Browser

export const NotificationHelper = {
    requestPermission: async () => {
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notification');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },

    show: (title: string, body: string) => {
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '/favicon.ico', // Placeholder
                    silent: false
                });
            } catch (e) {
                console.error("Notification failed", e);
            }
        }
    }
};
