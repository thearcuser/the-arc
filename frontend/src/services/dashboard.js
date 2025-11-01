import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase/config';
import { getUserPitchVideos } from './video';
import { getUnreadMessagesCount } from './messages';
import { getUserConnections } from './connections';

// Calculate profile completion similar to hook logic
const calculateProfileCompletion = (user) => {
  if (!user) return 0;

  let completed = 0;
  let total = 0;

  const basicFields = ['displayName', 'email', 'photoURL'];
  basicFields.forEach(field => {
    total++;
    if (user[field]) completed++;
  });

  if (user.userType === 'startup') {
    const startupFields = ['companyName', 'industry', 'description', 'currentStage', 'teamSize'];
    startupFields.forEach(() => {
      total++;
      if (user.onboardingCompleted) completed++;
    });
  } else if (user.userType === 'investor') {
    const investorFields = ['investmentFocus', 'stagePreference', 'investmentSize'];
    investorFields.forEach(() => {
      total++;
      if (user.onboardingCompleted) completed++;
    });
  } else {
    const individualFields = ['interests', 'ideaDescription', 'lookingFor'];
    individualFields.forEach(() => {
      total++;
      if (user.onboardingCompleted) completed++;
    });
  }

  return Math.round((completed / total) * 100);
};

/**
 * Get aggregated dashboard data for a user.
 * Returns: { connections, messages, profileCompletion, recentActivity, analytics }
 */
export const getDashboardData = async (user) => {
  if (!user || !user.uid) {
    return {
      connections: 0,
      messages: 0,
      profileCompletion: 0,
      recentActivity: [],
      analytics: {
        totalVideoViews: 0,
        totalVideoLikes: 0,
        videosCount: 0
      }
    };
  }

  try {
    const userId = user.uid;

    // Fetch several pieces in parallel
    const [connectionsList, unreadCount, videos] = await Promise.all([
      getUserConnections(userId).catch(() => []),
      getUnreadMessagesCount(userId).catch(() => 0),
      getUserPitchVideos(userId).catch(() => [])
    ]);

    const connections = Array.isArray(connectionsList) ? connectionsList.length : 0;
    const messages = typeof unreadCount === 'number' ? unreadCount : 0;

    // Analytics from videos
    const videosCount = videos.length;
    const totalVideoViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalVideoLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);

    // Build recent activity: videos (uploads), connections (lastInteraction), conversations (lastMessage)
    const activityItems = [];

    // Recent video uploads
    videos.slice(0, 10).forEach(v => {
      activityItems.push({
        id: v.id,
        type: 'video',
        title: v.title || 'Untitled video',
        timestamp: v.createdAt instanceof Date ? v.createdAt : (v.createdAt?.toDate ? v.createdAt.toDate() : new Date()),
        meta: { views: v.views || 0, likes: v.likes || 0 }
      });
    });

    // Connections recent activity (use lastInteraction or createdAt)
    (connectionsList || []).slice(0, 10).forEach(c => {
      activityItems.push({
        id: c.id,
        type: 'connection',
        title: `Connected with ${ (c.participants || []).filter(id=>id!==userId)[0] || 'someone' }`,
        timestamp: c.lastInteraction instanceof Date ? c.lastInteraction : (c.lastInteraction?.toDate ? c.lastInteraction.toDate() : (c.createdAt?.toDate ? c.createdAt.toDate() : new Date())),
        meta: { status: c.status || 'accepted' }
      });
    });

    // Recent conversations - fetch lastMessage from conversations collection
    try {
      const convRef = collection(db, 'conversations');
      const q = query(convRef, where('participants', 'array-contains', userId), orderBy('updatedAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        activityItems.push({
          id: docSnap.id,
          type: 'message',
          title: data.lastMessage?.content || 'New conversation activity',
          timestamp: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          meta: { unreadCount: data.unreadCount?.[userId] || 0 }
        });
      });
    } catch (err) {
      // Non-fatal - recent messages are optional
      console.warn('Unable to fetch recent conversations for dashboard:', err.message || err);
    }

    // Sort by timestamp descending and limit to 10
    activityItems.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivity = activityItems.slice(0, 10);

    return {
      connections,
      messages,
      profileCompletion: calculateProfileCompletion(user),
      recentActivity,
      analytics: {
        totalVideoViews,
        totalVideoLikes,
        videosCount
      }
    };

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return {
      connections: 0,
      messages: 0,
      profileCompletion: calculateProfileCompletion(user),
      recentActivity: [],
      analytics: { totalVideoViews: 0, totalVideoLikes: 0, videosCount: 0 }
    };
  }
};

export default {
  getDashboardData
};
