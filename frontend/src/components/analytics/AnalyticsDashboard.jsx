import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '../shared';
// Charts removed: replaced with compact summaries
import { HiTrendingUp, HiEye, HiHeart, HiUsers } from 'react-icons/hi';
import { getUserVideoAnalytics, getUserConnectionsAnalytics, getRecentlyViewedVideos } from '../../services/analytics';

const AnalyticsDashboard = ({ userId }) => {
  const [videoAnalytics, setVideoAnalytics] = useState(null);
  const [connectionsAnalytics, setConnectionsAnalytics] = useState(null);
  const [recentVideos, setRecentVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgViewDuration: 0,
    engagementRate: 0,
    conversionRate: 0
  });

  useEffect(() => {
    if (userId) {
      fetchAnalytics();
    }
  }, [userId, timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [videos, connections, recent] = await Promise.all([
        getUserVideoAnalytics(userId),
        getUserConnectionsAnalytics(userId),
        getRecentlyViewedVideos(userId, 5)
      ]);
      
      // Calculate performance metrics
      const totalEngagements = videos.totalLikes + videos.totalViews;
      const engagementRate = videos.totalViews > 0 
        ? ((totalEngagements / videos.totalViews) * 100).toFixed(1) 
        : 0;
      
      const connectionConversionRate = videos.totalViews > 0
        ? ((connections.totalConnections / videos.totalViews) * 100).toFixed(1)
        : 0;

      setPerformanceMetrics({
        avgViewDuration: (Math.random() * 60 + 30).toFixed(0), // Simulated for now, replace with actual data
        engagementRate,
        conversionRate: connectionConversionRate
      });
      
      setVideoAnalytics(videos);
      setConnectionsAnalytics(connections);
      setRecentVideos(recent);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  // Charts removed — display concise textual summaries below instead of graphs

  // Precompute simple summaries used in place of charts
  const dailyMetrics = videoAnalytics?.dailyMetrics || [];
  const totalViewsLastRange = dailyMetrics.reduce((s, d) => s + (d.views || 0), 0);
  const totalLikesLastRange = dailyMetrics.reduce((s, d) => s + (d.likes || 0), 0);
  const avgViewsPerDay = dailyMetrics.length ? Math.round(totalViewsLastRange / dailyMetrics.length) : 0;

  const dailyConnections = connectionsAnalytics?.dailyConnections || [];
  const newConnectionsLastRange = dailyConnections.reduce((s, d) => s + (d.count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Views</p>
                <p className="text-2xl font-bold text-blue-600">{videoAnalytics?.totalViews || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <HiEye className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Likes</p>
                <p className="text-2xl font-bold text-pink-600">{videoAnalytics?.totalLikes || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-500 flex items-center justify-center">
                <HiHeart className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Connections</p>
                <p className="text-2xl font-bold text-purple-600">{connectionsAnalytics?.totalConnections || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center">
                <HiUsers className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Videos</p>
                <p className="text-2xl font-bold text-green-600">{videoAnalytics?.totalVideos || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <HiTrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              timeRange === '7d'
                ? 'bg-primary-100 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              timeRange === '30d'
                ? 'bg-primary-100 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              timeRange === '90d'
                ? 'bg-primary-100 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-50 rounded-lg p-4">
          <p className="text-sm text-neutral-600 mb-1">Avg. View Duration</p>
          <p className="text-2xl font-bold text-neutral-900">{performanceMetrics.avgViewDuration}s</p>
          <p className="text-xs text-neutral-500 mt-1">Time spent watching</p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-4">
          <p className="text-sm text-neutral-600 mb-1">Engagement Rate</p>
          <p className="text-2xl font-bold text-neutral-900">{performanceMetrics.engagementRate}%</p>
          <p className="text-xs text-neutral-500 mt-1">Likes + Views / Total Views</p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-4">
          <p className="text-sm text-neutral-600 mb-1">Connection Rate</p>
          <p className="text-2xl font-bold text-neutral-900">{performanceMetrics.conversionRate}%</p>
          <p className="text-xs text-neutral-500 mt-1">Connections / Views</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'engagement'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Engagement
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'recent'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Recent Activity
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Engagement Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Video Engagement (Last {dailyMetrics.length} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-600">Total Views</p>
                  <p className="text-lg font-bold">{totalViewsLastRange}</p>
                  <p className="text-xs text-neutral-500">Last {dailyMetrics.length || 0} days</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-600">Avg Views / Day</p>
                  <p className="text-lg font-bold">{avgViewsPerDay}</p>
                  <p className="text-xs text-neutral-500">Across selected range</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-600">Total Likes</p>
                  <p className="text-lg font-bold">{totalLikesLastRange}</p>
                  <p className="text-xs text-neutral-500">Last {dailyMetrics.length || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connections Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Connections (Last {dailyConnections.length} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-600">Total Connections</p>
                  <p className="text-lg font-bold">{connectionsAnalytics?.totalConnections || 0}</p>
                  <p className="text-xs text-neutral-500">All time</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-600">New Connections</p>
                  <p className="text-lg font-bold">{newConnectionsLastRange}</p>
                  <p className="text-xs text-neutral-500">Last {dailyConnections.length || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="grid grid-cols-1 gap-6">
          {/* Daily Likes and Views Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Engagement (Last {dailyMetrics.length} days)</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyMetrics.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">No engagement data for the selected range</p>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto">
                  {dailyMetrics.map((d) => (
                    <div key={d.date} className="flex items-center justify-between p-3 bg-neutral-50 rounded">
                      <div className="text-sm text-neutral-700">{formatDate(d.date)}</div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        <div className="flex items-center gap-1"><HiEye className="w-4 h-4" /> <span>{d.views || 0}</span></div>
                        <div className="flex items-center gap-1"><HiHeart className="w-4 h-4" /> <span>{d.likes || 0}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'recent' && (
        <div className="space-y-6">
          {/* Recently Viewed Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Viewed Videos</CardTitle>
            </CardHeader>
            <CardContent>
              {recentVideos.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentVideos.map((video) => (
                    <div key={video.id} className="flex items-center space-x-4 p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex-shrink-0">
                        {video.user.photoURL ? (
                          <img
                            src={video.user.photoURL}
                            alt={video.user.displayName}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold">
                            {video.user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">{video.title || 'Untitled Video'}</p>
                        <p className="text-sm text-neutral-600 truncate">by {video.user.displayName}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-neutral-500">
                        <div className="flex items-center space-x-1">
                          <HiEye className="h-4 w-4" />
                          <span>{video.views || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <HiHeart className="h-4 w-4" />
                          <span>{video.likes || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
