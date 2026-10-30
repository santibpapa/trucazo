import { apiRequest } from './services'

export const analyticsPath = () => (window.location.hash.slice(1) || '/login').split('?')[0]
export const sendAnalytics = (payload: unknown) => apiRequest('/api/analytics', payload)
