import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Pause, Square, Upload, Clock, Volume2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import BlockNoteEditor from '@/components/BlockNoteEditor';
import { FeedbackRubric, FeedbackCriterion } from '@/types/course';

interface ConversationalFeedbackViewerProps {
  taskId: string;
  userId?: string;
  isDarkMode?: boolean;
  className?: string;
  readOnly?: boolean;
  viewOnly?: boolean;
  onMarkComplete?: () => void;
  isTestMode?: boolean;
  isAdminView?: boolean;
}

interface FeedbackResult {
  transcription: string;
  feedback: {
    strengths: string[];
    improvements: string[];
    deliverySuggestions: string[];
    overallScore: number;
    criteriaScores: Array<{
      name: string;
      score: number;
      maxScore: number;
      feedback: string;
    }>;
  };
}

interface ConversationalFeedbackConfig {
  maxDuration: number;
  prompt: any[];
  rubric: FeedbackRubric;
}

const ConversationalFeedbackViewer: React.FC<ConversationalFeedbackViewerProps> = ({
  taskId,
  userId = '',
  isDarkMode = true,
  className = "",
  readOnly = true,
  viewOnly = false,
  onMarkComplete,
  isTestMode = false,
  isAdminView = false
}) => {
  // Configuration state
  const [config, setConfig] = useState<ConversationalFeedbackConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Admin view state for learner submissions
  const [learnerSubmissions, setLearnerSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Load task configuration
  useEffect(() => {
    loadTaskConfig();
  }, [taskId, isAdminView]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const loadTaskConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.conversational_feedback_config) {
        setConfig(data.conversational_feedback_config);
      } else {
        throw new Error('Conversational feedback configuration not found');
      }

      // Load learner submissions if in admin view
      if (isAdminView) {
        await loadLearnerSubmissions();
      }
    } catch (error) {
      console.error("Error loading task config:", error);
      setError(error instanceof Error ? error.message : 'Failed to load task');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLearnerSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      // Fetch all submissions for this conversational feedback task
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}/submissions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.status}`);
      }

      const submissions = await response.json();
      setLearnerSubmissions(submissions);
      
      // Select the first submission by default if available
      if (submissions.length > 0) {
        setSelectedSubmission(submissions[0]);
      }
    } catch (error) {
      console.error("Error loading learner submissions:", error);
      // Don't set error state for submissions as they might not exist yet
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Clean up previous URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }
        
        // Create new URL
        audioUrlRef.current = URL.createObjectURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= (config?.maxDuration || 120)) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioUrlRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrlRef.current);
      audioRef.current = audio;
      
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    setFeedback(null);
    setIsSubmitted(false);
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const submitRecording = async () => {
    if (!audioBlob || !config) return;

    setIsProcessing(true);
    try {
      // Convert audio to base64 or upload to server
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('taskId', taskId);
      formData.append('userId', userId);
      formData.append('rubric', JSON.stringify(config.rubric));

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/conversational-feedback/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process recording: ${response.status}`);
      }

      const result = await response.json();
      setFeedback(result);
      setIsSubmitted(true);

      // Mark task as complete if callback is provided
      if (onMarkComplete) {
        onMarkComplete();
      }

    } catch (error) {
      console.error('Error processing recording:', error);
      setError('Failed to process your recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No configuration found for this task.</p>
      </div>
    );
  }

  // Admin View - Show learner submissions
  if (isAdminView) {
    return (
      <div className={`${className} bg-[#111111] text-white h-full overflow-auto`}>
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          
          {/* Prompt Section */}
          <div className="bg-[#1A1A1A] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Conversational Feedback Prompt</h2>
            <BlockNoteEditor
              initialContent={config.prompt}
              onChange={() => {}} // Read-only
              isDarkMode={isDarkMode}
              readOnly={true}
            />
          </div>

          {/* Assessment Criteria */}
          <div className="bg-[#1A1A1A] rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Assessment Criteria</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {config.rubric.criteria.map((criterion, index) => (
                <div key={index} className="p-4 bg-[#222222] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{criterion.name}</h4>
                    <span className="text-sm font-mono text-gray-400">/{criterion.maxScore}</span>
                  </div>
                  <p className="text-sm text-gray-300">{criterion.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Learner Submissions */}
          <div className="bg-[#1A1A1A] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Student Submissions</h3>
              {submissionsLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              )}
            </div>

            {learnerSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Submission List */}
                <div className="grid gap-4">
                  {learnerSubmissions.map((submission, index) => (
                    <div 
                      key={submission.id} 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSubmission?.id === submission.id 
                          ? 'border-blue-500 bg-[#222222]' 
                          : 'border-gray-600 bg-[#1A1A1A] hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{submission.learnerName || `Student ${index + 1}`}</h4>
                          <p className="text-sm text-gray-400">
                            Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {submission.feedback?.overallScore && (
                            <span className="px-2 py-1 bg-blue-600 rounded text-sm">
                              {submission.feedback.overallScore}%
                            </span>
                          )}
                          <Volume2 className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Submission Details */}
                {selectedSubmission && (
                  <div className="bg-[#222222] rounded-lg p-6 space-y-6">
                    <h4 className="text-lg font-semibold">
                      {selectedSubmission.learnerName || 'Student Submission'}
                    </h4>

                    {/* Audio Player */}
                    {selectedSubmission.audioUrl && (
                      <div className="bg-[#1A1A1A] rounded-lg p-4">
                        <h5 className="font-medium mb-3">Audio Recording</h5>
                        <audio 
                          controls 
                          className="w-full"
                          style={{ 
                            backgroundColor: '#333',
                            borderRadius: '8px'
                          }}
                        >
                          <source src={selectedSubmission.audioUrl} type="audio/webm" />
                          <source src={selectedSubmission.audioUrl} type="audio/mp4" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    {/* Transcription */}
                    {selectedSubmission.transcription && (
                      <div className="bg-[#1A1A1A] rounded-lg p-4">
                        <h5 className="font-medium mb-3">Transcription</h5>
                        <p className="text-gray-300 italic">"{selectedSubmission.transcription}"</p>
                      </div>
                    )}

                    {/* AI Feedback */}
                    {selectedSubmission.feedback && (
                      <div className="space-y-4">
                        <h5 className="font-medium">AI Feedback & Scoring</h5>
                        
                        {/* Overall Score */}
                        <div className="bg-[#1A1A1A] rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Overall Score</span>
                            <span className="text-2xl font-bold text-green-400">
                              {selectedSubmission.feedback.overallScore}%
                            </span>
                          </div>
                        </div>

                        {/* Criteria Scores */}
                        <div className="bg-[#1A1A1A] rounded-lg p-4">
                          <h6 className="font-medium mb-3">Detailed Scoring</h6>
                          <div className="grid gap-3">
                            {selectedSubmission.feedback.criteriaScores?.map((score: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-[#222222] rounded">
                                <div>
                                  <span className="font-medium">{score.name}</span>
                                  <p className="text-sm text-gray-400">{score.feedback}</p>
                                </div>
                                <span className="text-lg font-semibold">
                                  {score.score}/{score.maxScore}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Strengths */}
                        {selectedSubmission.feedback.strengths?.length > 0 && (
                          <div className="bg-[#1A1A1A] rounded-lg p-4">
                            <h6 className="font-medium text-green-400 mb-3">Strengths</h6>
                            <ul className="space-y-2">
                              {selectedSubmission.feedback.strengths.map((strength: string, index: number) => (
                                <li key={index} className="text-sm text-gray-300 flex items-start">
                                  <CheckCircle size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {selectedSubmission.feedback.improvements?.length > 0 && (
                          <div className="bg-[#1A1A1A] rounded-lg p-4">
                            <h6 className="font-medium text-orange-400 mb-3">Areas for Improvement</h6>
                            <ul className="space-y-2">
                              {selectedSubmission.feedback.improvements.map((improvement: string, index: number) => (
                                <li key={index} className="text-sm text-gray-300 flex items-start">
                                  <span className="text-orange-400 mr-2">📈</span>
                                  {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Delivery Suggestions */}
                        {selectedSubmission.feedback.deliverySuggestions?.length > 0 && (
                          <div className="bg-[#1A1A1A] rounded-lg p-4">
                            <h6 className="font-medium text-blue-400 mb-3">Delivery Tips</h6>
                            <ul className="space-y-2">
                              {selectedSubmission.feedback.deliverySuggestions.map((suggestion: string, index: number) => (
                                <li key={index} className="text-sm text-gray-300 flex items-start">
                                  <span className="text-blue-400 mr-2">💡</span>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-[#111111] text-white h-full overflow-auto`}>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Prompt Section */}
        <div className="bg-[#1A1A1A] rounded-lg p-6">
          <BlockNoteEditor
            initialContent={config.prompt}
            onChange={() => {}} // Read-only
            isDarkMode={isDarkMode}
            readOnly={true}
          />
        </div>

        {/* Recording Section */}
        {!isSubmitted && (
          <div className="bg-[#1A1A1A] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium">Record Your Response</h3>
                <p className="text-gray-400">
                  Maximum duration: {formatTime(config.maxDuration)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono">
                  {formatTime(recordingDuration)}
                </div>
                {isRecording && (
                  <div className="text-sm text-red-400 animate-pulse">● Recording...</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4">
                {!isRecording && !audioBlob && (
                  <button
                    onClick={startRecording}
                    disabled={viewOnly}
                    className="flex items-center px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors text-lg"
                  >
                    <Mic size={24} className="mr-3" />
                    Start Recording
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="flex items-center px-8 py-4 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-lg"
                  >
                    <Square size={24} className="mr-3" />
                    Stop Recording
                  </button>
                )}
              </div>

              {/* Audio Playback Controls */}
              {audioBlob && !isRecording && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={isPlaying ? pauseAudio : playAudio}
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      {isPlaying ? <Pause size={20} className="mr-2" /> : <Play size={20} className="mr-2" />}
                      {isPlaying ? 'Pause' : 'Play Recording'}
                    </button>
                    <button
                      onClick={deleteRecording}
                      disabled={viewOnly}
                      className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Square size={20} className="mr-2" />
                      Record Again
                    </button>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex items-center px-4 py-2 bg-[#222222] rounded-lg">
                      <Volume2 size={16} className="mr-2 text-green-400" />
                      <span className="text-sm">Recording completed ({formatTime(recordingDuration)})</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  {!viewOnly && (
                    <div className="flex justify-center">
                      <button
                        onClick={submitRecording}
                        disabled={isProcessing}
                        className="flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors text-lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={24} className="mr-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload size={24} className="mr-3" />
                            Submit for Feedback
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {feedback && isSubmitted && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-[#1A1A1A] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Overall Assessment</h3>
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-400 mr-2" />
                  <span className="text-2xl font-bold">{feedback.feedback.overallScore}%</span>
                </div>
              </div>
              
              {/* Transcription */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Transcription</h4>
                <div className="p-4 bg-[#222222] rounded-lg">
                  <p className="text-gray-300 italic">{feedback.transcription}</p>
                </div>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="bg-[#1A1A1A] rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Detailed Scores</h3>
              <div className="space-y-4">
                {feedback.feedback.criteriaScores.map((criterion, index) => (
                  <div key={index} className="p-4 bg-[#222222] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{criterion.name}</h4>
                      <span className={`text-lg font-bold ${getScoreColor(criterion.score, criterion.maxScore)}`}>
                        {criterion.score}/{criterion.maxScore}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{criterion.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Sections */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Strengths */}
              <div className="bg-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-400 mb-4">Strengths</h3>
                <ul className="space-y-2">
                  {feedback.feedback.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for Improvement */}
              <div className="bg-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-lg font-medium text-yellow-400 mb-4">Areas for Improvement</h3>
                <ul className="space-y-2">
                  {feedback.feedback.improvements.map((improvement, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start">
                      <span className="text-yellow-400 mr-2">→</span>
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Delivery Suggestions */}
              <div className="bg-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-400 mb-4">Delivery Tips</h3>
                <ul className="space-y-2">
                  {feedback.feedback.deliverySuggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start">
                      <span className="text-blue-400 mr-2">💡</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Try Again Button */}
            {!viewOnly && (
              <div className="flex justify-center">
                <button
                  onClick={deleteRecording}
                  className="flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <Mic size={20} className="mr-2" />
                  Record Another Response
                </button>
              </div>
            )}
          </div>
        )}

        {/* Assessment Criteria (always visible) */}
        <div className="bg-[#1A1A1A] rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Assessment Criteria</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {config.rubric.criteria.map((criterion, index) => (
              <div key={index} className="p-4 bg-[#222222] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{criterion.name}</h4>
                  <span className="text-sm font-mono text-gray-400">/{criterion.maxScore}</span>
                </div>
                <p className="text-sm text-gray-300">{criterion.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationalFeedbackViewer;
