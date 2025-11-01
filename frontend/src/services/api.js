// API service for handling API requests
import { auth, db } from '../utils/firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { sendChatMessage } from '../../../services/api';

const handleSendMessage = async () => {
  if (!inputMessage.trim()) return;

  const userMessage = inputMessage.trim();
  setInputMessage('');
  
  // Add user message to chat
  setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
  setIsTyping(true);

  try {
    // Call backend API
    const response = await sendChatMessage(userMessage);
    
    // Add bot response to chat
    setMessages(prev => [...prev, { 
      text: response.reply || response.message || 'Sorry, I could not process your request.', 
      sender: 'bot' 
    }]);
  } catch (error) {
    console.error('Error sending message:', error);
    setMessages(prev => [...prev, { 
      text: 'Sorry, there was an error connecting to the chatbot. Please try again.', 
      sender: 'bot' 
    }]);
  } finally {
    setIsTyping(false);
  }
};

// User API
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }
    
    return { data: userDoc.data() };
  } catch (error) {
    return { error };
  }
};

export const updateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, "users", userId);
    
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    return { error };
  }
};

// Startup API
export const createStartup = async (startupData, userId) => {
  try {
    // Create a new startup document with a generated ID
    const startupRef = doc(collection(db, "startups"));
    
    await setDoc(startupRef, {
      ...startupData,
      ownerId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update user document with startup reference
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      startupId: startupRef.id,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, startupId: startupRef.id };
  } catch (error) {
    return { error };
  }
};

export const getStartup = async (startupId) => {
  try {
    const startupRef = doc(db, "startups", startupId);
    const startupDoc = await getDoc(startupRef);
    
    if (!startupDoc.exists()) {
      throw new Error("Startup not found");
    }
    
    return { data: startupDoc.data() };
  } catch (error) {
    return { error };
  }
};

// Investor API
export const createInvestorProfile = async (investorData, userId) => {
  try {
    // Create a new investor document
    const investorRef = doc(collection(db, "investors"));
    
    await setDoc(investorRef, {
      ...investorData,
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update user document with investor reference
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      investorId: investorRef.id,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, investorId: investorRef.id };
  } catch (error) {
    return { error };
  }
};

export const getInvestorProfile = async (investorId) => {
  try {
    const investorRef = doc(db, "investors", investorId);
    const investorDoc = await getDoc(investorRef);
    
    if (!investorDoc.exists()) {
      throw new Error("Investor profile not found");
    }
    
    return { data: investorDoc.data() };
  } catch (error) {
    return { error };
  }
};

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'https://the-arc-backend1.vercel.app/';

export const sendChatMessage = async (message) => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Export all API functions
const api = {
  getUserProfile,
  updateUserProfile,
  createStartup,
  getStartup,
  createInvestorProfile,
  getInvestorProfile,
  sendChatMessage
};

export default api;
