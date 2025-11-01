// Matching service for handling swipe-based connections
import { 
  sendConnectionRequest, 
  acceptConnectionRequest, 
  getConnectionRequest,
  getConnection
} from './connections';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase/config';

/**
 * Handle swipe-based connection logic
 * @param {string} fromUserId - ID of user swiping right
 * @param {string} toUserId - ID of user being swiped on
 * @param {Object} fromUserData - Data of user swiping right
 * @param {Object} toUserData - Data of user being swiped on
 * @returns {Promise<Object>} - Connection result
 */
export const handleSwipeRight = async (fromUserId, toUserId, fromUserData, toUserData) => {
  try {
    console.log('Handling swipe right:', { fromUserId, toUserId, fromUserData, toUserData });

    // Check if already connected
    const existingConnection = await getConnection(fromUserId, toUserId);
    if (existingConnection) {
      console.log('Already connected:', existingConnection);
      return { type: 'error', message: 'Already connected' };
    }

    // If user is an investor
    if (fromUserData.userType === 'investor') {
      // Create immediate connection for investors
      const connectionData = {
        user1Id: fromUserId,
        user2Id: toUserId,
        participants: [fromUserId, toUserId],
        status: 'accepted',
        createdAt: serverTimestamp(),
        lastInteraction: serverTimestamp()
      };

      const connectionRef = await addDoc(collection(db, 'connections'), connectionData);
      console.log('✅ Investor connection created:', connectionRef.id);
      
      return {
        type: 'success',
        message: 'Connection created',
        data: {
          id: connectionRef.id,
          ...connectionData,
          createdAt: new Date(),
          lastInteraction: new Date()
        }
      };
    }

    // If both users are startups/individuals
    if (fromUserData.userType !== 'investor' && toUserData.userType !== 'investor') {
      // Check for existing request from the other user
      const existingRequest = await getConnectionRequest(toUserId, fromUserId);
      
      if (existingRequest) {
        // Accept the existing request
        const connection = await acceptConnectionRequest(existingRequest.id);
        console.log('✅ Mutual connection created:', connection.id);
        return {
          type: 'success',
          message: 'Mutual connection created',
          data: connection
        };
      } else {
        // Send a new connection request
        const request = await sendConnectionRequest(fromUserId, toUserId, fromUserData);
        console.log('✅ Connection request sent:', request.id);
        return {
          type: 'success',
          message: 'Connection request sent',
          data: request
        };
      }
    }

    // Handle startup/individual swiping right on investor
    // Send connection request to investor
    const request = await sendConnectionRequest(fromUserId, toUserId, fromUserData);
    console.log('✅ Connection request sent to investor:', request.id);
    return {
      type: 'success',
      message: 'Connection request sent to investor',
      data: request
    };
  } catch (error) {
    console.error('Error handling swipe right:', error);
    return {
      type: 'error',
      message: error.message || 'Failed to process connection'
    };
  }
};

/**
 * Get user type and data
 * @param {string} userId - User ID to fetch data for
 * @returns {Promise<Object>} - User data including type
 */
export const getUserTypeAndData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return userDoc.data();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};