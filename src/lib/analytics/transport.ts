export const analyticsPath = () => window.location.pathname
export const sendAnalytics = (payload: unknown) => fetch('/api/analytics', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true,
})
