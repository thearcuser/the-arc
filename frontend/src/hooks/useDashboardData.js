// Hook for fetching and managing dashboard data
import { useState, useEffect } from 'react';
import { getDashboardData } from '../services/dashboard';

export const useDashboardData = (user) => {
  const [dashboardData, setDashboardData] = useState({
    connections: 0,
    messages: 0,
    profileCompletion: 0,
    recentActivity: [],
    analytics: { totalVideoViews: 0, totalVideoLikes: 0, videosCount: 0 }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !user.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getDashboardData(user);
        setDashboardData(data);
      } catch (err) {
        console.error('Error in useDashboardData:', err);
        setError(err?.message || 'Failed to load dashboard data');
        setDashboardData(prev => ({
          ...prev,
          profileCompletion: prev.profileCompletion || 0
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [user]);

  return { dashboardData, isLoading, error, refresh: async () => {
    if (!user?.uid) return;
    try {
      const data = await getDashboardData(user);
      setDashboardData(data);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  }};
};