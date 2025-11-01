import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components';
import { Card, CardContent, Button, Spinner, Badge } from '../components';
import { HiMail, HiLocationMarker, HiBriefcase, HiUserGroup, HiArrowLeft, HiPlay, HiPhone, HiGlobe, HiUser } from 'react-icons/hi';
import { FaLinkedin, FaTwitter, FaGithub, FaInstagram } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase/config';
import { getOrCreateConversation } from '../services/messages';
import useAuthStore from '../stores/authStore';
import { getVideoUrl, getThumbnailUrl } from '../utils/cloudinary/config';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch user profile
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError('User not found');
        return;
      }

      const userData = userSnap.data();

      // Fetch user-specific profile data based on userType
      let additionalData = {};
      if (userData.userType === 'startup') {
        const startupRef = doc(db, 'startups', userId);
        const startupSnap = await getDoc(startupRef);
        if (startupSnap.exists()) {
          additionalData = startupSnap.data();
        }
      } else if (userData.userType === 'individual') {
        const individualRef = doc(db, 'individuals', userId);
        const individualSnap = await getDoc(individualRef);
        if (individualSnap.exists()) {
          additionalData = individualSnap.data();
        }
      } else if (userData.userType === 'investor') {
        const investorRef = doc(db, 'investors', userId);
        const investorSnap = await getDoc(investorRef);
        if (investorSnap.exists()) {
          additionalData = investorSnap.data();
        }
      }

      setProfile({
        ...userData,
        ...additionalData,
        uid: userId
      });

      // Fetch user's videos
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const videosRef = collection(db, 'pitchVideos');
      const videosQuery = query(videosRef, where('userId', '==', userId));
      const videosSnap = await getDocs(videosQuery);
      
      const videosData = videosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setVideos(videosData);

    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      const conversationId = await getOrCreateConversation(currentUser.uid, userId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (err) {
      console.error('Error opening message:', err);
      alert('Failed to open conversation');
    }
  };

  const toggleVideoPlay = (videoId) => {
    setPlayingVideoId(prev => prev === videoId ? null : videoId);
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'startup':
        return 'bg-blue-100 text-blue-800';
      case 'individual':
        return 'bg-green-100 text-green-800';
      case 'investor':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-red-600 mb-4">{error || 'Profile not found'}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center space-x-2"
      >
        <HiArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </Button>

      {/* Modern Profile Header */}
      <Card className="mb-6 overflow-hidden shadow-xl border-neutral-200">
        {/* Cover Banner with Pattern */}
        <div className="relative h-56 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTJWMGgydjMwem0tMiAwaC0yVjBoMnYzMHptLTIgMGgtMlYwaDJ2MzB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          
          {/* Action Buttons - Top Right */}
          {currentUser.uid !== userId && (
            <div className="absolute top-6 right-6 z-10">
              <Button 
                onClick={handleMessage} 
                className="flex items-center space-x-2 bg-primary-100 text-primary-600 hover:bg-primary-50 shadow-lg"
              >
                <HiMail className="h-5 w-5" />
                <span>Message</span>
              </Button>
            </div>
          )}
        </div>

        <CardContent className="relative pt-0 pb-8">
          {/* Profile Picture - Overlapping the banner */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative -mt-20 mb-6">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="h-40 w-40 rounded-full border-8 border-white object-cover shadow-2xl ring-4 ring-primary-100"
                />
              ) : (
                <div className="h-40 w-40 rounded-full border-8 border-white bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-6xl font-bold shadow-2xl ring-4 ring-primary-100">
                  {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {/* Online Status Indicator */}
              <div className="absolute bottom-4 right-4 h-8 w-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
            </div>

            {/* Profile Info */}
            <div className="w-full text-center md:text-left px-6">
              <h1 className="text-4xl font-bold text-neutral-900 mb-2">
                {profile.displayName || 'Unknown User'}
              </h1>
              
              {profile.position && (
                <p className="text-xl text-neutral-600 mb-3 font-medium">
                  {profile.position}
                </p>
              )}

              {/* Badges Row */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                <Badge className={`${getUserTypeColor(profile.userType)} text-sm font-semibold px-4 py-2`}>
                  {profile.userType === 'startup' ? '🚀 Startup Founder' :
                   profile.userType === 'investor' ? '💰 Investor' : '👤 Individual'}
                </Badge>
                {profile.userType === 'startup' && profile.companyName && (
                  <Badge variant="secondary" className="px-4 py-2">
                    <HiBriefcase className="h-3 w-3 mr-1" />
                    {profile.companyName}
                  </Badge>
                )}
                {profile.location && (
                  <Badge variant="secondary" className="px-4 py-2">
                    <HiLocationMarker className="h-3 w-3 mr-1" />
                    {profile.location}
                  </Badge>
                )}
              </div>

              {/* Bio Section */}
              {(profile.bio || profile.description) && (
                <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-6 mb-6 border border-neutral-200 max-w-4xl mx-auto md:mx-0">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">About</h3>
                  <p className="text-neutral-700 leading-relaxed text-base">
                    {profile.bio || profile.description}
                  </p>
                </div>
              )}

              {/* Contact Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {profile.email && (
                  <div className="bg-white rounded-2xl p-5 flex items-center space-x-4 border-2 border-neutral-100 hover:border-primary-200 hover:shadow-lg transition-all duration-200">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
                        <HiMail className="h-6 w-6 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm text-neutral-900 font-medium truncate">{profile.email}</p>
                    </div>
                  </div>
                )}

                {profile.phoneNumber && (
                  <div className="bg-white rounded-2xl p-5 flex items-center space-x-4 border-2 border-neutral-100 hover:border-secondary-200 hover:shadow-lg transition-all duration-200">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                        <HiPhone className="h-6 w-6 text-secondary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Phone</p>
                      <p className="text-sm text-neutral-900 font-medium truncate">{profile.phoneNumber}</p>
                    </div>
                  </div>
                )}

                {profile.website && (
                  <div className="bg-white rounded-2xl p-5 flex items-center space-x-4 border-2 border-neutral-100 hover:border-green-200 hover:shadow-lg transition-all duration-200">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <HiGlobe className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Website</p>
                      <a 
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 font-medium truncate hover:underline block"
                      >
                        {profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              {profile.socialLinks && (profile.socialLinks.linkedin || profile.socialLinks.twitter || profile.socialLinks.github || profile.socialLinks.instagram || profile.socialLinks.website) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Connect</h3>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {profile.socialLinks.linkedin && (
                      <a
                        href={profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#0A66C2] text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                        title="LinkedIn"
                      >
                        <FaLinkedin className="h-6 w-6" />
                      </a>
                    )}
                    {profile.socialLinks.twitter && (
                      <a
                        href={profile.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#1DA1F2] text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                        title="Twitter/X"
                      >
                        <FaTwitter className="h-6 w-6" />
                      </a>
                    )}
                    {profile.socialLinks.github && (
                      <a
                        href={profile.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-12 w-12 rounded-xl bg-neutral-900 text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                        title="GitHub"
                      >
                        <FaGithub className="h-6 w-6" />
                      </a>
                    )}
                    {profile.socialLinks.instagram && (
                      <a
                        href={profile.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                        title="Instagram"
                      >
                        <FaInstagram className="h-6 w-6" />
                      </a>
                    )}
                    {profile.socialLinks.website && (
                      <a
                        href={profile.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                        title="Website"
                      >
                        <HiGlobe className="h-6 w-6" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Interested Domains */}
              {profile.interestedDomains && profile.interestedDomains.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Interested In</h3>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {profile.interestedDomains.map((domain, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 border-2 border-primary-200 hover:shadow-md transition-shadow duration-200"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Videos Section */}
          {videos.length > 0 && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900 flex items-center">
                    <HiPlay className="mr-2 h-6 w-6 text-primary-600" />
                    Videos ({videos.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {videos.map((video) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative aspect-[9/16] bg-neutral-900 rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300"
                      onClick={() => toggleVideoPlay(video.id)}
                    >
                      {playingVideoId === video.id ? (
                        <video
                          src={getVideoUrl(video.cloudinaryPublicId)}
                          controls
                          autoPlay
                          className="w-full h-full object-cover"
                          onEnded={() => setPlayingVideoId(null)}
                        />
                      ) : (
                        <>
                          <img
                            src={getThumbnailUrl(video.cloudinaryPublicId)}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="bg-white/90 rounded-full p-4 transform group-hover:scale-110 transition-transform duration-300">
                              <HiPlay className="h-10 w-10 text-primary-600" />
                            </div>
                          </div>
                          {video.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                              <p className="text-white text-sm font-medium line-clamp-2">
                                {video.title}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        {/* <div className="space-y-6">
          
          {profile.userType === 'startup' && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center">
                  <HiBriefcase className="mr-2 h-5 w-5 text-primary-600" />
                  Startup Info
                </h2>
                
                <div className="space-y-4">
                  {profile.company && (
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200">
                      <p className="text-xs text-primary-700 font-semibold uppercase tracking-wide mb-1">Company</p>
                      <p className="font-bold text-primary-900 text-lg">{profile.company}</p>
                    </div>
                  )}

                  {profile.industry && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-1">Industry</p>
                      <p className="font-medium text-neutral-900 text-base">{profile.industry}</p>
                    </div>
                  )}

                  {profile.currentStage && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-1">Stage</p>
                      <Badge className="bg-secondary-100 text-secondary-800 font-semibold capitalize">
                        {profile.currentStage}
                      </Badge>
                    </div>
                  )}

                  {profile.teamSize && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-1">Team Size</p>
                      <p className="font-medium text-neutral-900 text-base flex items-center">
                        <HiUserGroup className="h-5 w-5 mr-2 text-neutral-600" />
                        {profile.teamSize}
                      </p>
                    </div>
                  )}

                  {profile.fundingRequired && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-1">Funding Required</p>
                      <p className="font-medium text-neutral-900 text-base">{profile.fundingRequired}</p>
                    </div>
                  )}

                  {profile.lookingFor && (
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-2">Looking For</p>
                      <p className="text-neutral-700 text-sm leading-relaxed">{profile.lookingFor}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {profile.userType === 'individual' && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center">
                  <HiUser className="mr-2 h-5 w-5 text-primary-600" />
                  About Me
                </h2>
                
                <div className="space-y-4">
                  {profile.skills && profile.skills.length > 0 && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-3">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1.5">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.interests && profile.interests.length > 0 && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-3">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <Badge key={index} className="bg-secondary-100 text-secondary-800 px-3 py-1.5">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.lookingFor && (
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-2">Looking For</p>
                      <p className="text-neutral-700 text-sm leading-relaxed">{profile.lookingFor}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {profile.userType === 'investor' && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center">
                  💼 Investment Info
                </h2>
                
                <div className="space-y-4">
                  {profile.investmentFocus && profile.investmentFocus.length > 0 && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-3">Focus Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.investmentFocus.map((focus, index) => (
                          <Badge key={index} className="bg-purple-100 text-purple-800 px-3 py-1.5 font-semibold">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.stagePreference && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-1">Stage Preference</p>
                      <Badge className="bg-secondary-100 text-secondary-800 font-semibold capitalize">
                        {Array.isArray(profile.stagePreference) ? profile.stagePreference.join(', ') : profile.stagePreference}
                      </Badge>
                    </div>
                  )}

                  {profile.investmentRange && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">Investment Range</p>
                      <p className="font-bold text-purple-900 text-lg">{profile.investmentRange}</p>
                    </div>
                  )}

                  {profile.portfolioSize && (
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-1">Portfolio Size</p>
                      <p className="font-medium text-neutral-900 text-base">{profile.portfolioSize}</p>
                    </div>
                  )}

                  {profile.lookingFor && (
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-2">Looking For</p>
                      <p className="text-neutral-700 text-sm leading-relaxed">{profile.lookingFor}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div> */}
      </div>
    </DashboardLayout>
  );
};

export default PublicProfilePage;