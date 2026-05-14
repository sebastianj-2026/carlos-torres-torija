import apiClient from './authService';
import { DashboardKpis } from '../types/dashboard.types';
import { BossKpis }      from '../types/bossDashboard.types';
import { AnalyticsData } from '../types/analytics.types';

export const getKpis = () =>
  apiClient.get<DashboardKpis>('/dashboard/kpis').then(r => r.data);

export const getBossKpis = () =>
  apiClient.get<BossKpis>('/dashboard/boss-kpis').then(r => r.data);

export const getAnalytics = (mes?: number, anio?: number) => {
  const params = new URLSearchParams();
  if (mes)  params.set('mes',  String(mes));
  if (anio) params.set('anio', String(anio));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get<AnalyticsData>(`/dashboard/analytics${qs}`).then(r => r.data);
};
