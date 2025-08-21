export function initRouter(onRouteChange) {
    window.addEventListener('popstate', () => {
        onRouteChange(window.location.pathname);
    });

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-link]');
        if (a) {
            e.preventDefault();
            history.pushState(null, '', a.href);
            onRouteChange(window.location.pathname);
        }
    });
}
