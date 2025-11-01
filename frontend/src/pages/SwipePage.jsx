import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  HiHeart, 
  HiX, 
  HiUserAdd, 
  HiShare,
  HiCheck,
  HiRefresh,
  HiArrowLeft,
  HiPlay,
  HiPause,
  HiVolumeOff,
  HiVolumeUp,
  HiChevronDoubleLeft,
  HiChevronDoubleRight
} from 'react-icons/hi';
import useAuthStore from '../stores/authStore';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase/config';
import { getVideoUrl, getThumbnailUrl } from '../utils/cloudinary/config';
import { toggleVideoLike } from '../services/video';
import { trackVideoView } from '../services/analytics';
import { handleSwipeRight, getUserTypeAndData } from '../services/matching';

const SwipePage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const observerRef = useRef(null);
  const viewedVideosRef = useRef(new Set());
  const viewTimersRef = useRef({});

  // Fetch videos
  useEffect(() => {
    fetchVideos();
  }, [user]);

  const fetchVideos = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const videosRef = collection(db, 'pitchVideos');
      const snapshot = await getDocs(videosRef);
      
      const videosData = await Promise.all(
        snapshot.docs.map(async (videoDoc) => {
          const videoData = videoDoc.data();
          
          if (videoData.userId === user.uid && user.userType !== 'investor') {
            return null;
          }
          
          const userDoc = await getDoc(doc(db, 'users', videoData.userId));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          return {
            id: videoDoc.id,
            ...videoData,
            user: {
              uid: videoData.userId,
              displayName: userData.displayName || 'Anonymous',
              photoURL: userData.photoURL || null,
              userType: userData.userType || 'individual',
              company: userData.company || null,
              location: userData.location || 'Unknown',
              bio: userData.bio || null
            }
          };
        })
      );
      
      setVideos(videosData.filter(video => video !== null));
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Intersection Observer for autoplay
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.75
    };

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        const videoId = video.dataset.videoId;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
          // Always start muted for autoplay, but respect user preference after interaction
          if (!hasUserInteracted) {
            video.muted = true;
          } else {
            video.muted = isMuted;
          }
          
          video.play().catch(err => console.log('Autoplay prevented:', err));

          if (videoId && !viewedVideosRef.current.has(videoId)) {
            viewTimersRef.current[videoId] = setTimeout(async () => {
              try {
                await trackVideoView(videoId, user.uid);
                viewedVideosRef.current.add(videoId);
                console.log('📊 Video view tracked:', videoId);
              } catch (err) {
                console.error('Failed to track video view:', err);
              }
            }, 3000);
          }
        } else {
          video.pause();
          if (videoId && viewTimersRef.current[videoId]) {
            clearTimeout(viewTimersRef.current[videoId]);
            delete viewTimersRef.current[videoId];
          }
        }
      });
    }, options);

    videoRefs.current.forEach((videoEl) => {
      if (videoEl) observerRef.current.observe(videoEl);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      Object.values(viewTimersRef.current).forEach(timerId => {
        clearTimeout(timerId);
      });
    };
  }, [user.uid, videos, isMuted, hasUserInteracted]);

  // Load and persist mute preference
  useEffect(() => {
    try {
      const key = user?.uid ? `arc:muted:${user.uid}` : 'arc:muted:anon';
      const stored = localStorage.getItem(key);
      if (stored !== null) setIsMuted(stored === 'true');
    } catch (e) {
      console.error('Error loading mute preference:', e);
    }
  }, [user]);

  useEffect(() => {
    try {
      const key = user?.uid ? `arc:muted:${user.uid}` : 'arc:muted:anon';
      localStorage.setItem(key, isMuted.toString());
    } catch (e) {
      console.error('Error saving mute preference:', e);
    }
  }, [isMuted, user]);

  // Apply mute state to all videos when it changes (only after user interaction)
  useEffect(() => {
    if (hasUserInteracted) {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.muted = isMuted;
        }
      });
    }
  }, [isMuted, hasUserInteracted]);

  const scrollToVideo = (index) => {
    if (containerRef.current && containerRef.current.children[index]) {
      containerRef.current.children[index].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  const handleSwipeComplete = async (direction, video) => {
    if (direction === 'right') {
      setShowFeedback('connect');
      try {
        const fromUserData = await getUserTypeAndData(user.uid);
        const result = await handleSwipeRight(
          user.uid,
          video.userId,
          {
            ...fromUserData,
            displayName: user.displayName,
            photoURL: user.photoURL
          },
          video.user
        );
        
        if (result.type === 'error') {
          throw new Error(result.message);
        }
        
        console.log('✅ Connection action successful:', result.message);
        
        if (result.data?.status === 'accepted') {
          setShowFeedback('connect');
        } else {
          setShowFeedback('pending');
        }
      } catch (err) {
        console.error('❌ Connection action failed:', err);
        setShowFeedback('connectError');
        setTimeout(() => {
          setShowFeedback(null);
        }, 1500);
        return;
      }
    } else if (direction === 'left') {
      setShowFeedback('pass');
    }

    setTimeout(() => {
      setShowFeedback(null);
      if (currentIndex < videos.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        scrollToVideo(nextIndex);
      }
    }, 800);
  };

  const handleLike = async (video) => {
    setShowFeedback('like');
    try {
      const result = await toggleVideoLike(video.id, user.uid);
      console.log('✅ Video like toggled:', video.id, result);
      setVideos(prevVideos => 
        prevVideos.map(v => 
          v.id === video.id 
            ? { ...v, likes: result.likes, isLiked: result.liked }
            : v
        )
      );
    } catch (err) {
      console.error('❌ Failed to like video:', err);
    }
    setTimeout(() => setShowFeedback(null), 1000);
  };

  const handleShare = (video) => {
    if (navigator.share) {
      navigator.share({
        title: video.title || 'Check out this pitch',
        text: `Watch ${video.user.displayName}'s pitch`,
        url: window.location.href
      }).catch(err => console.log('Share failed:', err));
    }
  };

  const handleRefresh = () => {
    setCurrentIndex(0);
    scrollToVideo(0);
    fetchVideos();
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-white text-lg">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchVideos}
            className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center px-4">
          <div className="bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
            <HiCheck className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            No videos available
          </h3>
          <p className="text-gray-400 mb-6">
            Check back later for new content
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      {/* Minimal Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-white font-bold text-xl">Discover</h1>
        <button
          onClick={handleRefresh}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
        >
          <HiRefresh className="h-6 w-6" />
        </button>
      </header>

      {/* Video Container - Vertical Scroll */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video, index) => (
          <ReelsVideo
            key={video.id}
            video={video}
            index={index}
            isActive={index === currentIndex}
            isFirstVideo={index === 0}
            videoRef={(el) => (videoRefs.current[index] = el)}
            onSwipeComplete={handleSwipeComplete}
            onLike={handleLike}
            onShare={handleShare}
            showFeedback={showFeedback}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            hasUserInteracted={hasUserInteracted}
            setHasUserInteracted={setHasUserInteracted}
          />
        ))}
      </div>
    </div>
  );
};

// Individual Reels Video Component
const ReelsVideo = ({ 
  video, 
  index,
  isActive,
  isFirstVideo,
  videoRef, 
  onSwipeComplete, 
  onLike, 
  onShare,
  showFeedback,
  isMuted,
  setIsMuted,
  hasUserInteracted,
  setHasUserInteracted
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const internalVideoRef = useRef(null);

  // Hide hints after 5 seconds
  useEffect(() => {
    if (isFirstVideo && showHints) {
      const timer = setTimeout(() => setShowHints(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVideo, showHints]);

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    setShowHints(false);
    
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      onSwipeComplete(direction, video);
    }
  };

  const togglePlayPause = () => {
    const videoEl = internalVideoRef.current;
    if (videoEl) {
      setHasUserInteracted(true);
      setShowHints(false);
      
      if (videoEl.paused) {
        videoEl.play().catch(err => console.log('Play prevented:', err));
        setIsPlaying(true);
      } else {
        videoEl.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const videoEl = internalVideoRef.current;
    if (videoEl) {
      setHasUserInteracted(true);
      setShowHints(false);
      
      const newMuted = !isMuted;
      videoEl.muted = newMuted;
      setIsMuted(newMuted);

      if (!newMuted && videoEl.paused) {
        videoEl.play().catch(err => console.log('Play prevented after unmute:', err));
        setIsPlaying(true);
      }
    }
  };

  return (
    <motion.div 
      className="relative h-screen w-full snap-start snap-always flex items-center justify-center"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      onDragStart={() => setShowHints(false)}
    >
      {/* Video Player */}
      <div className="relative h-full w-full max-w-[480px] mx-auto bg-black">
        <video
          ref={(el) => {
            internalVideoRef.current = el;
            if (typeof videoRef === 'function') videoRef(el);
            else if (videoRef && typeof videoRef === 'object') videoRef.current = el;
          }}
          data-video-id={video.id}
          src={getVideoUrl(video.cloudinaryPublicId)}
          poster={getThumbnailUrl(video.cloudinaryPublicId)}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload="auto"
          onClick={togglePlayPause}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Modern Swipe Instructions - Show on first video */}
        <AnimatePresence>
          {isFirstVideo && showHints && !hasUserInteracted && (
            <>
              {/* Left Swipe - Pass */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ 
                      x: [-15, 0, -15],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut"
                    }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full"></div>
                    <div className="relative bg-gradient-to-r from-red-500 to-red-600 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl border border-red-400/50">
                      <HiChevronDoubleLeft className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-3 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full"
                  >
                    <p className="text-white text-xs sm:text-sm font-semibold whitespace-nowrap">Swipe to Pass</p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Right Swipe - Connect */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ 
                      x: [15, 0, 15],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut",
                      delay: 0.3
                    }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full"></div>
                    <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl border border-green-400/50">
                      <HiChevronDoubleRight className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="mt-3 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full"
                  >
                    <p className="text-white text-xs sm:text-sm font-semibold whitespace-nowrap">Swipe to Connect</p>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Overlay Feedback */}
        <AnimatePresence>
          {showFeedback && isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none z-50"
            >
              {showFeedback === 'like' && (
                <div className="bg-pink-500 rounded-full p-8">
                  <HiHeart className="h-16 w-16 text-white fill-current" />
                </div>
              )}
              {showFeedback === 'connect' && (
                <div className="bg-green-500 rounded-full p-8">
                  <HiCheck className="h-16 w-16 text-white" />
                </div>
              )}
              {showFeedback === 'pending' && (
                <div className="bg-blue-500 rounded-full p-8">
                  <HiUserAdd className="h-16 w-16 text-white" />
                </div>
              )}
              {showFeedback === 'connectError' && (
                <div className="bg-red-500 rounded-full p-8">
                  <HiX className="h-16 w-16 text-white" />
                </div>
              )}
              {showFeedback === 'pass' && (
                <div className="bg-red-500 rounded-full p-8">
                  <HiX className="h-16 w-16 text-white" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe Direction Indicators */}
        <motion.div
          className="absolute top-1/2 left-4 sm:left-8 -translate-y-1/2 pointer-events-none z-10"
          style={{
            opacity: useTransform(x, [50, 200], [0, 1]),
          }}
        >
          <div className="bg-green-500 text-white font-bold text-2xl sm:text-3xl px-4 py-3 sm:px-6 sm:py-4 rounded-2xl transform rotate-12 border-4 border-white shadow-2xl">
            CONNECT
          </div>
        </motion.div>

        <motion.div
          className="absolute top-1/2 right-4 sm:right-8 -translate-y-1/2 pointer-events-none z-10"
          style={{
            opacity: useTransform(x, [-200, -50], [1, 0]),
          }}
        >
          <div className="bg-red-500 text-white font-bold text-2xl sm:text-3xl px-4 py-3 sm:px-6 sm:py-4 rounded-2xl transform -rotate-12 border-4 border-white shadow-2xl">
            PASS
          </div>
        </motion.div>

        {/* Action Buttons - Right Side */}
        <div className="absolute right-3 sm:right-4 bottom-28 sm:bottom-32 flex flex-col space-y-4 sm:space-y-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onSwipeComplete('right', video)}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full p-3 sm:p-4 shadow-lg backdrop-blur-sm"
          >
            <HiUserAdd className="h-6 w-6 sm:h-7 sm:w-7" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onLike(video)}
            className="bg-white/20 backdrop-blur-sm text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-pink-500 transition-colors"
          >
            <HiHeart className="h-6 w-6 sm:h-7 sm:w-7" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onShare(video)}
            className="bg-white/20 backdrop-blur-sm text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-blue-500 transition-colors"
          >
            <HiShare className="h-6 w-6 sm:h-7 sm:w-7" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onSwipeComplete('left', video)}
            className="bg-white/20 backdrop-blur-sm text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-red-500 transition-colors"
          >
            <HiX className="h-6 w-6 sm:h-7 sm:w-7" />
          </motion.button>
        </div>

        {/* Play/Pause & Mute Controls */}
        <div className="absolute top-16 sm:top-20 right-3 sm:right-4 flex flex-col space-y-2 sm:space-y-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlayPause}
            className="bg-black/50 backdrop-blur-sm text-white rounded-full p-2.5 sm:p-3 shadow-lg"
          >
            {isPlaying ? <HiPause className="h-4 w-4 sm:h-5 sm:w-5" /> : <HiPlay className="h-4 w-4 sm:h-5 sm:w-5" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className="bg-black/50 backdrop-blur-sm text-white rounded-full p-2.5 sm:p-3 shadow-lg"
          >
            {isMuted ? <HiVolumeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <HiVolumeUp className="h-4 w-4 sm:h-5 sm:w-5" />}
          </motion.button>
        </div>

        {/* User Info Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 sm:p-6 pb-6 sm:pb-8 text-white">
          <div className="flex items-start space-x-2 sm:space-x-3 mb-2 sm:mb-3">
            {video.user.photoURL ? (
              <img
                src={video.user.photoURL}
                alt={video.user.displayName}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-white shadow-lg cursor-pointer"
                onClick={() => window.open(`/profile/${video.userId}`, '_blank')}
              />
            ) : (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold text-base sm:text-lg border-2 border-white shadow-lg cursor-pointer">
                {video.user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold mb-0.5 flex items-center flex-wrap">
                <span className="truncate">{video.user.displayName}</span>
                <span className="ml-2 text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap">
                  {video.user.userType === 'startup' ? '🚀 Startup' : 
                   video.user.userType === 'investor' ? '💰 Investor' : '👤 Individual'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm opacity-90 truncate">
                {video.user.userType === 'startup' && video.user.company ? video.user.company : video.user.location}
              </p>
            </div>
          </div>

          {video.title && (
            <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 line-clamp-1">
              {video.title}
            </p>
          )}
          {video.user.bio && (
            <p className="text-xs sm:text-sm opacity-80 line-clamp-2">
              {video.user.bio}
            </p>
          )}

          <div className="mt-2 sm:mt-3">
            <span className="text-xs bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full inline-block">
              {video.videoType === 'pitch' ? '🎯 Pitch Video' : '💼 Investment Opportunity'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipePage;