import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Mic, MicOff, Play, Pause, Square, Upload, Trash2, Plus, Save, Eye, Clock, Volume2 } from 'lucide-react';
import BlockNoteEditor from '@/components/BlockNoteEditor';
import { FeedbackRubric, FeedbackCriterion } from '@/types/course';

interface ConversationalFeedbackConfig {
  maxDuration: number; // in seconds
  prompt: any[]; // BlockNote content blocks for the prompt
  rubric: FeedbackRubric;
}

interface ConversationalFeedbackEditorProps {
  taskId?: string;
  initialConfig?: ConversationalFeedbackConfig;
  onChange?: (config: ConversationalFeedbackConfig) => void;
  isDarkMode?: boolean;
  className?: string;
  isPreviewMode?: boolean;
  readOnly?: boolean;
  onPublish?: () => void;
  status?: string;
  onPublishSuccess?: (updatedData?: any) => void;
  showPublishConfirmation?: boolean;
  onPublishCancel?: () => void;
  isEditMode?: boolean;
  onSaveSuccess?: (updatedData?: any) => void;
  scheduledPublishAt?: string | null;
}

export interface ConversationalFeedbackEditorHandle {
  saveDraft: () => Promise<void>;
  savePublished: () => Promise<void>;
  cancel: () => void;
  hasContent: () => boolean;
  hasChanges: () => boolean;
}

const ConversationalFeedbackEditor = forwardRef<ConversationalFeedbackEditorHandle, ConversationalFeedbackEditorProps>(({
  taskId,
  initialConfig,
  onChange,
  isDarkMode = true,
  className = "",
  isPreviewMode = false,
  readOnly = false,
  onPublish,
  status,
  onPublishSuccess,
  showPublishConfirmation,
  onPublishCancel,
  isEditMode = false,
  onSaveSuccess,
  scheduledPublishAt
}, ref) => {
  // Configuration state
  const [config, setConfig] = useState<ConversationalFeedbackConfig>({
    maxDuration: 120, // 2 minutes default
    prompt: [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ "text": "Record Your Response", "type": "text", styles: {} }]
      },
      {
        type: "paragraph",
        content: [{ "text": "Please record a clear response to the following prompt. You have up to 2 minutes to share your thoughts.", "type": "text", styles: {} }]
      }
    ],
    rubric: {
      name: "Speech Assessment Rubric",
      criteria: [
        {
          name: "Clarity",
          description: "How clear and understandable is the speech",
          maxScore: 4
        },
        {
          name: "Content Quality",
          description: "Relevance and depth of the response content",
          maxScore: 4
        },
        {
          name: "Organization",
          description: "Logical structure and flow of ideas",
          maxScore: 4
        },
        {
          name: "Delivery",
          description: "Pace, tone, and overall presentation quality",
          maxScore: 4
        }
      ]
    }
  });

  // UI State
  const [activeTab, setActiveTab] = useState<'prompt' | 'rubric' | 'preview'>('prompt');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recording state for preview
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Initialize configuration from props
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  // Load task data if taskId is provided
  useEffect(() => {
    if (taskId && !initialConfig) {
      loadTaskData();
    }
  }, [taskId]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const loadTaskData = async () => {
    if (!taskId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform API data to our config format
      if (data.conversational_feedback_config) {
        setConfig(data.conversational_feedback_config);
      }
    } catch (error) {
      console.error("Error loading task data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (newConfig: ConversationalFeedbackConfig) => {
    setConfig(newConfig);
    if (onChange) {
      onChange(newConfig);
    }
  };

  const handlePromptChange = (content: any[]) => {
    const newConfig = { ...config, prompt: content };
    handleConfigChange(newConfig);
  };

  const handleMaxDurationChange = (duration: number) => {
    const newConfig = { ...config, maxDuration: duration };
    handleConfigChange(newConfig);
  };

  const handleRubricChange = (rubric: FeedbackRubric) => {
    const newConfig = { ...config, rubric };
    handleConfigChange(newConfig);
  };

  const addCriterion = () => {
    const newCriterion: FeedbackCriterion = {
      name: "New Criterion",
      description: "Description of this criterion",
      maxScore: 4
    };
    
    const newRubric = {
      ...config.rubric,
      criteria: [...config.rubric.criteria, newCriterion]
    };
    
    handleRubricChange(newRubric);
  };

  const updateCriterion = (index: number, criterion: FeedbackCriterion) => {
    const newCriteria = [...config.rubric.criteria];
    newCriteria[index] = criterion;
    
    const newRubric = {
      ...config.rubric,
      criteria: newCriteria
    };
    
    handleRubricChange(newRubric);
  };

  const removeCriterion = (index: number) => {
    const newCriteria = config.rubric.criteria.filter((_, i) => i !== index);
    const newRubric = {
      ...config.rubric,
      criteria: newCriteria
    };
    handleRubricChange(newRubric);
  };

  // Recording functions for preview
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
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
          if (newDuration >= config.maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
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
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // API functions
  const handleSaveDraft = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}/conversational_feedback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: "Conversational Feedback",
          config: config,
          scheduled_publish_at: scheduledPublishAt,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      const updatedData = await response.json();
      
      if (onSaveSuccess) {
        onSaveSuccess(updatedData);
      }
    } catch (error) {
      console.error("Error saving conversational feedback:", error);
    }
  };

  const handleSavePublished = async () => {
    console.log('ConversationalFeedbackEditor: handleSavePublished called');
    console.log('TaskId:', taskId);
    console.log('Config:', config);
    
    if (!taskId) {
      console.log('No taskId, returning early');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}/conversational_feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: "Conversational Feedback",
          config: config,
          scheduled_publish_at: scheduledPublishAt,
          status: 'published'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to publish: ${response.status}`);
      }

      const updatedData = await response.json();
      
      if (onPublishSuccess) {
        onPublishSuccess(updatedData);
      }
    } catch (error) {
      console.error("Error publishing conversational feedback:", error);
      setPublishError(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    // Reset to initial state or close
    if (onPublishCancel) {
      onPublishCancel();
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    saveDraft: handleSaveDraft,
    savePublished: handleSavePublished,
    cancel: handleCancel,
    hasContent: () => {
      console.log('ConversationalFeedbackEditor: hasContent called');
      console.log('Config prompt length:', config.prompt.length);
      console.log('Config rubric criteria length:', config.rubric.criteria.length);
      const hasContent = config.prompt.length > 0 && config.rubric.criteria.length > 0;
      console.log('Has content result:', hasContent);
      return hasContent;
    },
    hasChanges: () => {
      // Basic change detection - could be more sophisticated
      return JSON.stringify(config) !== JSON.stringify(initialConfig);
    }
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-[#111111] text-white h-full flex flex-col`}>
      {/* Header with tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'prompt' ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Eye className="inline mr-2" size={16} />
          Prompt
        </button>
        <button
          onClick={() => setActiveTab('rubric')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'rubric' ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Save className="inline mr-2" size={16} />
          Rubric
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'preview' ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Play className="inline mr-2" size={16} />
          Preview
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Recording Prompt</h3>
              <p className="text-gray-400 mb-4">
                Create the instructions that learners will see before they start recording their response.
              </p>
              
              {/* Max duration setting */}
              <div className="mb-6 p-4 bg-[#1A1A1A] rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  <Clock className="inline mr-2" size={16} />
                  Maximum Recording Duration
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={config.maxDuration}
                    onChange={(e) => handleMaxDurationChange(parseInt(e.target.value))}
                    className="w-20 px-3 py-2 bg-[#222222] border border-gray-600 rounded-md text-white"
                    disabled={readOnly}
                  />
                  <span className="text-gray-400">seconds ({formatTime(config.maxDuration)})</span>
                </div>
              </div>

              <BlockNoteEditor
                initialContent={config.prompt}
                onChange={handlePromptChange}
                isDarkMode={isDarkMode}
                readOnly={readOnly}
                className="min-h-[300px]"
                placeholder="Enter the prompt or instructions for learners..."
              />
            </div>
          </div>
        )}

        {activeTab === 'rubric' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Assessment Rubric</h3>
                <p className="text-gray-400">Define the criteria for evaluating responses</p>
              </div>
              {!readOnly && (
                <button
                  onClick={addCriterion}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <Plus size={16} className="mr-2" />
                  Add Criterion
                </button>
              )}
            </div>

            <div className="space-y-4">
              {config.rubric.criteria.map((criterion, index) => (
                <div key={index} className="p-4 bg-[#1A1A1A] rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, { ...criterion, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#222222] border border-gray-600 rounded-md text-white font-medium"
                        placeholder="Criterion name"
                        disabled={readOnly}
                      />
                      <textarea
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, { ...criterion, description: e.target.value })}
                        className="w-full px-3 py-2 bg-[#222222] border border-gray-600 rounded-md text-white resize-none"
                        rows={2}
                        placeholder="Description of this criterion"
                        disabled={readOnly}
                      />
                      <div className="flex items-center space-x-4">
                        <label className="text-sm text-gray-400">Max Score:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={criterion.maxScore}
                          onChange={(e) => updateCriterion(index, { ...criterion, maxScore: parseInt(e.target.value) })}
                          className="w-16 px-2 py-1 bg-[#222222] border border-gray-600 rounded text-white text-sm"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => removeCriterion(index)}
                        className="ml-4 p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Preview Experience</h3>
              <p className="text-gray-400 mb-6">
                This is how learners will see the conversational feedback activity.
              </p>
            </div>

            {/* Prompt display */}
            <div className="bg-[#1A1A1A] rounded-lg p-6">
              <BlockNoteEditor
                initialContent={config.prompt}
                onChange={() => {}} // Read-only in preview
                isDarkMode={isDarkMode}
                readOnly={true}
                className="mb-6"
              />

              {/* Recording interface */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">Record Your Response</h4>
                    <p className="text-sm text-gray-400">
                      Maximum duration: {formatTime(config.maxDuration)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono">
                      {formatTime(recordingDuration)}
                    </div>
                    {isRecording && (
                      <div className="text-sm text-red-400">Recording...</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {!isRecording && !audioBlob && (
                    <button
                      onClick={startRecording}
                      className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <Mic size={20} className="mr-2" />
                      Start Recording
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Square size={20} className="mr-2" />
                      Stop Recording
                    </button>
                  )}

                  {audioBlob && !isRecording && (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={isPlaying ? pauseAudio : playAudio}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        {isPlaying ? <Pause size={16} className="mr-2" /> : <Play size={16} className="mr-2" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button
                        onClick={deleteRecording}
                        className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </button>
                      <button
                        onClick={startRecording}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <Mic size={16} className="mr-2" />
                        Record Again
                      </button>
                    </div>
                  )}
                </div>

                {audioBlob && (
                  <div className="mt-4 p-4 bg-[#222222] rounded-lg">
                    <div className="flex items-center">
                      <Volume2 size={16} className="mr-2 text-green-400" />
                      <span className="text-sm">Recording completed ({formatTime(recordingDuration)})</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rubric preview */}
            <div className="bg-[#1A1A1A] rounded-lg p-6">
              <h4 className="font-medium mb-4">Assessment Criteria</h4>
              <div className="space-y-3">
                {config.rubric.criteria.map((criterion, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-[#222222] rounded">
                    <div>
                      <div className="font-medium text-sm">{criterion.name}</div>
                      <div className="text-xs text-gray-400">{criterion.description}</div>
                    </div>
                    <div className="text-sm font-mono">/{criterion.maxScore}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {publishError && (
        <div className="mx-6 mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400">{publishError}</p>
        </div>
      )}

      {/* Loading overlay */}
      {isPublishing && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#222222] p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p>Publishing...</p>
          </div>
        </div>
      )}
    </div>
  );
});

ConversationalFeedbackEditor.displayName = 'ConversationalFeedbackEditor';

export default ConversationalFeedbackEditor;
