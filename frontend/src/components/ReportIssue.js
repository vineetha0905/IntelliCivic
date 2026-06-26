import React, { useState, useContext, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, Camera, Mic, Type, MapPin, Upload } from 'lucide-react';
import apiService from '../services/api';

const ReportIssue = ({ user }) => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [reportData, setReportData] = useState({
    title: '',
    description: '',
    location: '',
    coordinates: null
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [recordingType, setRecordingType] = useState('text'); // 'photo', 'text'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechRecognitionAvailable, setIsSpeechRecognitionAvailable] = useState(false);
  const recognitionRef = useRef(null);
  const targetRef = useRef('description');
  const lastTranscriptTitleRef = useRef('');
  const lastTranscriptDescRef = useRef('');
  
  // AI states
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Check if speech recognition is available on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    setIsSpeechRecognitionAvailable(!!SpeechRecognition && isHTTPS);
  }, []);

  // Translation function using Google Translate free endpoint
  const translateToEnglish = async (text) => {
    if (!text || !text.trim()) return text;
    
    try {
      // First try with auto-detect (works best for most languages including Telugu)
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`
      );
      
      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract translated text from the response
      if (data && data[0] && Array.isArray(data[0]) && data[0].length > 0) {
        let translatedText = '';
        for (let i = 0; i < data[0].length; i++) {
          if (data[0][i] && data[0][i][0]) {
            translatedText += data[0][i][0];
          }
        }
        translatedText = translatedText.trim();
        
        // Always return the translated text (even if same, as it might already be English)
        if (translatedText) {
          console.log('Translation result:', { original: text, translated: translatedText });
          return translatedText;
        }
      }
      
      // If extraction failed, try alternative parsing
      console.warn('Primary translation parsing failed, trying alternative...');
      if (data && data[0]) {
        const altText = String(data[0]).trim();
        if (altText && altText !== text) {
          console.log('Alternative translation result:', { original: text, translated: altText });
          return altText;
        }
      }
      
      // Fallback: return original text
      console.warn('Translation extraction failed, returning original text:', text);
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      toast.warning('Translation unavailable. Using recognized text as-is.');
      return text;
    }
  };

  const ensureSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser. Try Chrome.');
      return null;
    }

    // Check if we're on HTTPS (required for speech recognition)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast.error('Speech recognition requires HTTPS. Please use a secure connection.');
      return null;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      // Support multiple languages - try Telugu first, fallback to auto-detect
      // Telugu (te-IN) ensures proper recognition of Telugu speech
      recognition.lang = 'te-IN,hi-IN,en-IN'; // Support Telugu, Hindi, English (India)
      recognition.interimResults = false; // only final results to avoid repetition
      recognition.continuous = true;
      recognition.onresult = async (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        transcript = transcript.trim();
        if (!transcript) return;
        
        console.log('Recognized text (before translation):', transcript);
        
        // Translate to English immediately after recognition
        const translatedText = await translateToEnglish(transcript);
        
        console.log('Translated text (after translation):', translatedText);
        
        // Only store and display the English translated text
        if (targetRef.current === 'title') {
          if (translatedText === lastTranscriptTitleRef.current) return;
          lastTranscriptTitleRef.current = translatedText;
          setReportData(prev => ({
            ...prev,
            title: (prev.title ? (prev.title.trim() + ' ') : '') + translatedText
          }));
        } else {
          if (translatedText === lastTranscriptDescRef.current) return;
          lastTranscriptDescRef.current = translatedText;
          setReportData(prev => ({
            ...prev,
            description: (prev.description ? (prev.description.trim() + ' ') : '') + translatedText
          }));
        }
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.onerror = (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
        
        // Handle specific error types
        const errorType = error.error || error.message || '';
        
        if (errorType === 'not-allowed') {
          toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (errorType === 'service-not-allowed') {
          toast.error('Speech recognition service is not available. This may be due to browser settings or network restrictions. Please use text input instead.');
        } else if (errorType === 'no-speech') {
          toast.warning('No speech detected. Please try again.');
        } else if (errorType === 'audio-capture') {
          toast.error('No microphone found. Please connect a microphone and try again.');
        } else if (errorType === 'network') {
          toast.error('Network error. Please check your internet connection and try again.');
        } else if (errorType === 'aborted') {
          // User stopped the recognition, don't show error
          return;
        } else {
          // Generic error message with more context
          const errorMsg = error.message || 'Unknown error';
          toast.error(`Speech recognition unavailable: ${errorMsg}. Please use text input instead.`);
        }
      };
      recognitionRef.current = recognition;
    }
    return recognitionRef.current;
  };

  const toggleListening = () => {
    const recognition = ensureSpeechRecognition();
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      if (targetRef.current === 'title') {
        lastTranscriptTitleRef.current = '';
      } else {
        lastTranscriptDescRef.current = '';
      }
      recognition.start();
      setIsListening(true);
    }
  };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // For demonstration, we'll just store the file name
      // In a real app, you'd upload this to a server
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    // Reset the file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setReportData(prev => ({
        ...prev,
        coordinates: [23.2599, 77.4126],
        location: 'MG Road, Bhopal (Default Location)'
      }));
      return;
    }
    
    toast.info('Requesting your location...');
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setReportData(prev => ({
          ...prev,
          coordinates: [latitude, longitude],
          location: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
        }));
        toast.success('Location obtained successfully');
        navigator.geolocation.clearWatch(watchId);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMsg = 'Unable to get your location';
        if (error.code === 1) {
          errorMsg = 'Location permission denied. Please allow location access.';
        } else if (error.code === 2) {
          errorMsg = 'Location unavailable. Please check your device settings.';
        } else if (error.code === 3) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        toast.error(errorMsg);
        
        // Fallback: try with less strict options
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setReportData(prev => ({
                ...prev,
                coordinates: [latitude, longitude],
                location: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
              }));
              toast.success('Location obtained successfully');
            },
            () => {
              // Final fallback
              setReportData(prev => ({
                ...prev,
                coordinates: [23.2599, 77.4126],
                location: 'MG Road, Bhopal (Default Location)'
              }));
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
          );
        }, 1000);
        navigator.geolocation.clearWatch(watchId);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 }
    );
    
    // Clear watch after 20 seconds
      setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
    }, 20000);
  };

  const handlePreSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!reportData.coordinates || !reportData.coordinates[0] || !reportData.coordinates[1]) {
      toast.error('Please get your location first');
      return;
    }

    if (reportData.title.length < 5) {
      toast.warning('Title must be at least 5 characters long');
      return;
    }

    if (reportData.description.length < 10) {
      toast.warning('Description must be at least 10 characters long');
      return;
    }

    setIsAnalyzing(true);
    try {
      let imageBase64 = null;
      if (selectedFile) {
        imageBase64 = await fileToBase64(selectedFile);
      }

      // Call analyze API
      const analysisResult = await apiService.analyzeIssue({
        description: reportData.description,
        imageBase64
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('AI analysis failed. Please try again.');
      }

      const parsedAnalysis = analysisResult.data;
      
      // Validate image relevance
      if (parsedAnalysis.image_relevant === false) {
        const relevanceReason = parsedAnalysis.image_relevance_reason || '';
        if (relevanceReason.includes('Image does not match')) {
          toast.error('Image does not match the selected category, issue title, or complaint description. Please upload a relevant image or update the complaint details.');
        } else if (relevanceReason.includes('Abusive language detected')) {
          toast.error('Abusive language detected. Please remove inappropriate words before submitting your complaint.');
        } else {
          toast.error(relevanceReason || 'The image is not relevant to the issue.');
        }
        setIsAnalyzing(false);
        return;
      }

      setAiAnalysis(parsedAnalysis);

      // Check duplicates
      const dupResult = await apiService.checkDuplicate({
        description: reportData.description,
        category: parsedAnalysis.category,
        locationName: reportData.location,
        coordinates: {
          latitude: reportData.coordinates[0],
          longitude: reportData.coordinates[1]
        },
        imageBase64
      });

      setDuplicateCheck(dupResult.data || { duplicate: false });
      setShowAiModal(true);
    } catch (err) {
      console.error('Pre-submission check failed:', err);
      if (err.message.includes('Abusive language detected')) {
        toast.error('Abusive language detected. Please remove inappropriate words before submitting your complaint.');
        setIsAnalyzing(false);
        return;
      }
      if (err.message.includes('Image does not match')) {
        toast.error('Image does not match the selected category, issue title, or complaint description. Please upload a relevant image or update the complaint details.');
        setIsAnalyzing(false);
        return;
      }
      toast.error(`Analysis error: ${err.message}. Proceeding to manual confirmation.`);
      // Proceed with defaults if analysis completely fails
      setAiAnalysis({
        category: 'Other',
        priority: 'Medium',
        department: 'Public Works',
        summary: reportData.description.slice(0, 100),
        recommended_action: 'Manual inspection',
        urgency_reason: 'Analysis unavailable'
      });
      setDuplicateCheck({ duplicate: false });
      setShowAiModal(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    setShowAiModal(false);

    let issueData = null;

    try {
      // 1) Upload image to Cloudinary if available
      let imageUrl = null;
      let uploadedPublicId = null;
      
      if (selectedFile) {
        try {
          const uploadResponse = await apiService.uploadImage(selectedFile);
          const uploaded = uploadResponse?.data || uploadResponse || {};
          imageUrl = uploaded.url || uploaded.secure_url || null;
          uploadedPublicId = uploaded.publicId || uploaded.public_id || null;
        } catch (uploadError) {
          console.warn('Image upload failed, continuing without image:', uploadError);
        }
      }

      // Map priority to valid enum values: ['low', 'medium', 'high', 'urgent', 'critical']
      const finalPriority = (aiAnalysis?.priority || 'medium').toLowerCase();

      // Prepare issue data
      issueData = {
        title: reportData.title,
        description: reportData.description,
        category: aiAnalysis?.category || 'Other',
        priority: ['low', 'medium', 'high', 'urgent', 'critical'].includes(finalPriority) ? finalPriority : 'medium',
        location: {
          name: reportData.location,
          coordinates: {
            latitude: reportData.coordinates[0],
            longitude: reportData.coordinates[1]
          }
        },
        images: imageUrl ? [{
          url: imageUrl,
          publicId: uploadedPublicId || imageUrl.split('/').pop(),
          caption: 'Issue image'
        }] : [],
        aiAnalysis: {
          category: aiAnalysis?.category || 'Other',
          priority: aiAnalysis?.priority || 'Medium',
          department: aiAnalysis?.department || 'Public Works',
          summary: aiAnalysis?.summary || reportData.description.slice(0, 100),
          recommendedAction: aiAnalysis?.recommended_action || 'Inspect',
          urgencyReason: aiAnalysis?.urgency_reason || ''
        }
      };

      // Submit to backend
      await apiService.createIssue(issueData);
      
      setIsSubmitting(false);
      toast.success('Issue reported successfully!');
      navigate('/citizen');
    } catch (error) {
      setIsSubmitting(false);
      console.error('Issue creation error:', error);
      if (error.message.includes('Abusive language detected')) {
        toast.error('Abusive language detected. Please remove inappropriate words before submitting your complaint.');
      } else if (error.message.includes('Image does not match')) {
        toast.error('Image does not match the selected category, issue title, or complaint description. Please upload a relevant image or update the complaint details.');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  const handleSupportExisting = async (dupId) => {
    try {
      setIsSubmitting(true);
      await apiService.upvoteIssue(dupId);
      await apiService.verifyIssue(dupId, { status: 'verified', comment: 'Supported duplicate report' });
      
      toast.success('Supported existing issue successfully! +8 Points Awarded.');
      setShowAiModal(false);
      setIsSubmitting(false);
      navigate('/citizen');
    } catch (error) {
      console.error('Error supporting duplicate issue:', error);
      toast.error(`Error: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <button 
            onClick={() => navigate('/citizen')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#1e4359', 
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="form-title">{t('reportIssue')}</h1>
        </div>

        {/* Evidence Capture Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            color: '#1e293b', 
            marginBottom: '1rem' 
          }}>
            Capture Evidence
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(1, 1fr)', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <button
              type="button"
              className={`btn-secondary ${recordingType === 'photo' ? 'selected' : ''}`}
              onClick={() => setRecordingType('photo')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem',
                background: recordingType === 'photo' ? '#1e4359' : 'transparent',
                color: recordingType === 'photo' ? 'white' : '#1e4359'
              }}
            >
              <Camera size={20} />
              <span>Photo</span>
            </button>

            
          </div>

          {/* File Upload for Photo */}
          {recordingType === 'photo' && (
            <div 
              className={`image-upload ${selectedFile ? 'has-image' : ''}`}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              
              {selectedFile ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Preview"
                    className="uploaded-image"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <p className="upload-text">Click to change image</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Camera className="upload-icon" />
                  <p className="upload-text">Click to take photo or upload image</p>
                </div>
              )}
            </div>
          )}

          {/* Voice panel removed as requested; mic remains near Description */}
        </div>

        <form onSubmit={handlePreSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Issue Title</label>
            <div className="form-row-inline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Brief title for the issue"
                value={reportData.title}
                onChange={(e) => setReportData(prev => ({...prev, title: e.target.value}))}
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  targetRef.current = 'title';
                  toggleListening();
                }}
                disabled={!isSpeechRecognitionAvailable}
                title={isSpeechRecognitionAvailable ? "Dictate title with your voice" : "Speech recognition not available. Please use text input."}
                style={{ minWidth: '120px', opacity: isSpeechRecognitionAvailable ? 1 : 0.5, cursor: isSpeechRecognitionAvailable ? 'pointer' : 'not-allowed' }}
              >
                {isListening && targetRef.current === 'title' ? 'Stop' : 'Speak'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <div className="form-row-inline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Describe the issue in detail or use the mic to dictate"
                value={reportData.description}
                onChange={(e) => setReportData(prev => ({...prev, description: e.target.value}))}
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { targetRef.current = 'description'; toggleListening(); }}
                disabled={!isSpeechRecognitionAvailable}
                title={isSpeechRecognitionAvailable ? "Dictate with your voice" : "Speech recognition not available. Please use text input."}
                style={{ minWidth: '120px', opacity: isSpeechRecognitionAvailable ? 1 : 0.5, cursor: isSpeechRecognitionAvailable ? 'pointer' : 'not-allowed' }}
              >
                {isListening ? 'Stop' : 'Speak'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <div className="form-row-inline" style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter location or use GPS"
                value={reportData.location}
                onChange={(e) => setReportData(prev => ({...prev, location: e.target.value}))}
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleGetLocation}
                className="btn-secondary"
                style={{ 
                  padding: '1rem',
                  minWidth: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <MapPin size={16} />
                GPS
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting || isAnalyzing}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* AI Analysis and Duplicate Check Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            maxWidth: '550px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: '#1e4359',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '8px'
              }}>
                ✨
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Gemini AI Analysis Report
              </h2>
            </div>

            {/* Analysis details */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600' }}>Detected Category</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600' }}>
                    {aiAnalysis?.category}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600' }}>Priority</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span style={{
                      background: aiAnalysis?.priority?.toLowerCase() === 'critical' ? '#fee2e2' :
                                  aiAnalysis?.priority?.toLowerCase() === 'high' ? '#ffedd5' :
                                  aiAnalysis?.priority?.toLowerCase() === 'medium' ? '#eff6ff' : '#f1f5f9',
                      color: aiAnalysis?.priority?.toLowerCase() === 'critical' ? '#991b1b' :
                             aiAnalysis?.priority?.toLowerCase() === 'high' ? '#9a3412' :
                             aiAnalysis?.priority?.toLowerCase() === 'medium' ? '#1e40af' : '#334155',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {aiAnalysis?.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600' }}>Assigned Department</span>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                    🏢 {aiAnalysis?.department}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600' }}>AI Summary</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.925rem', color: '#334155', lineHeight: '1.5' }}>
                  {aiAnalysis?.summary}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600' }}>Urgency Justification</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#475569', fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{aiAnalysis?.urgency_reason}"
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600' }}>Recommended Resolution Action</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#334155', fontWeight: '500' }}>
                  🔧 {aiAnalysis?.recommended_action}
                </p>
              </div>
            </div>

            {/* Smart duplicate checker warnings */}
            {duplicateCheck?.duplicate ? (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c2410c', fontWeight: '700' }}>
                  ⚠️ Duplicate Detected nearby ({duplicateCheck.confidence}% confidence)
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#7c2d12', lineHeight: '1.4' }}>
                  {duplicateCheck.reason}
                </p>
                <div style={{ fontSize: '0.875rem', color: '#9a3412', fontWeight: '600' }}>
                  "Similar issue already reported nearby. Support the existing issue instead."
                </div>
                
                {/* Duplicate choices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleSupportExisting(duplicateCheck.duplicateIssueId)}
                    disabled={isSubmitting}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    👍 Support Existing (+8 Points)
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/issue/${duplicateCheck.duplicateIssueId}`)}
                      style={{
                        background: '#e2e8f0',
                        color: '#334155',
                        border: 'none',
                        padding: '0.625rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      🔗 Join Complaint
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/issue/${duplicateCheck.duplicateIssueId}?addEvidence=true`)}
                      style={{
                        background: '#e2e8f0',
                        color: '#334155',
                        border: 'none',
                        padding: '0.625rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      📸 Add Evidence
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '1rem',
                color: '#15803d',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ✅ Unique report. No duplicates detected in coordinates vicinity.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Go Back & Edit
              </button>
              {!duplicateCheck?.duplicate && (
                <button
                  type="button"
                  onClick={executeSubmit}
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    background: '#1e4359',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: '0 4px 6px -1px rgba(30, 67, 89, 0.3)'
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm & Submit (+10 Points)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI analyzing overlay */}
      {isAnalyzing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 2000
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.2)',
            borderTop: '4px solid #38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
            Gemini AI analyzing report details...
          </span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ReportIssue;