import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
import {
  XMarkIcon,
  MicrophoneIcon,
  StopIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { useFinance } from '../context/FinanceContext';

interface VoiceTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceTransactionModal({ isOpen, onClose }: VoiceTransactionModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showRegretWarningDialog, setShowRegretWarningDialog] = useState(false);
  const [regretWarningMessage, setRegretWarningMessage] = useState('');
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  // FIX: Assuming fetchTransactions will be added to FinanceContext
  const { fetchTransactions } = useFinance();

  const handleTryAgain = () => {
    setTranscript('');
    setIsListening(false);
    setIsSending(false);
  };

  const startListening = () => {
    handleTryAgain();
    setIsListening(true);
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition.');
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setTranscript(event.results[0][0].transcript);
      setIsListening(false);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognition.start();
  };

  const handleConfirm = async () => {
    if (!transcript) return;

    setIsSending(true);
    try {
      // FIX: Use the correct key 'token' to get the token
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_BASE_URL}/api/ai/voice-command`, 
        { command: transcript },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data && response.data.success) {
        // FIX: Handle the two outcomes (warning vs. no warning) directly
        if (response.data.regretWarning) {
          // If there's a warning, show the dialog and stop
          setRegretWarningMessage(response.data.message);
          setShowRegretWarningDialog(true);
          setPendingCommand(transcript);
          setIsSending(false); // Stop loading indicator
        } else {
          // If no warning, refresh data and close the modal          
          setIsSending(false);
          onClose();
        }
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error sending voice command to backend:', error);
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(handleTryAgain, 300);
    }
  }, [isOpen]);

  const handleRegretConfirmation = async (confirm: boolean) => {
    setShowRegretWarningDialog(false);
    if (confirm && pendingCommand) {
      setIsSending(true);
      try {
        const token = localStorage.getItem('financeApp_token');
        const response = await axios.post(
          `${API_BASE_URL}/api/ai/voice-command`,
          { command: pendingCommand, confirmRegret: true },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.data && response.data.success) {
          await fetchTransactions();
        }
      } catch (error) {
        console.error('Error re-sending voice command with confirmation:', error);
      } finally {
        setIsSending(false);
        setPendingCommand(null);
        onClose();
      }
    } else {
      setPendingCommand(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Command</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Mic Button and Transcript Display */}
            <div className="text-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startListening}
                disabled={isListening}
                className={`relative w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-200 ${
                  isListening 
                    ? 'bg-red-500 shadow-lg shadow-red-500/50' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50'
                }`}
              >
                {isListening ? (
                   <StopIcon className="w-8 h-8 text-white" />
                ) : (
                  <MicrophoneIcon className="w-8 h-8 text-white" />
                )}
              </motion.button>

              {transcript ? (
                <motion.p initial={{opacity: 0}} animate={{opacity: 1}} className="mt-4 text-lg text-gray-800 dark:text-gray-200 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  "{transcript}"
                </motion.p>
              ) : (
                 <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {isListening ? 'Listening...' : 'Tap to speak'}
                 </p>
              )}
            </div>
            
            {/* Action Buttons */}
            {transcript && !isListening && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mt-6"
              >
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleTryAgain}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Try Again
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleConfirm}
                    disabled={isSending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {isSending ? (
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                    Confirm
                  </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
      {showRegretWarningDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm mx-auto"
          >
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {regretWarningMessage}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleRegretConfirmation(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                No
              </button>
              <button
                onClick={() => handleRegretConfirmation(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Yes, I'm Sure
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}