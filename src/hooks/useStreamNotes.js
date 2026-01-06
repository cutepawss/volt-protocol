import { useState, useEffect } from 'react';

/**
 * useStreamNotes - Hook for managing stream notes
 * 
 * Stores notes in localStorage with key: `stream_note_${streamId}`
 */

export const useStreamNotes = (streamId) => {
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Load note from localStorage on mount
  useEffect(() => {
    if (!streamId) return;
    
    const savedNote = localStorage.getItem(`stream_note_${streamId}`);
    if (savedNote) {
      setNote(savedNote);
    }
  }, [streamId]);

  // Save note to localStorage
  const saveNote = (newNote) => {
    if (!streamId) return;
    
    setNote(newNote);
    localStorage.setItem(`stream_note_${streamId}`, newNote);
    setIsEditing(false);
  };

  const updateNote = (newNote) => {
    setNote(newNote);
  };

  const deleteNote = () => {
    if (!streamId) return;
    
    setNote('');
    localStorage.removeItem(`stream_note_${streamId}`);
    setIsEditing(false);
  };

  return {
    note,
    isEditing,
    setIsEditing,
    saveNote,
    updateNote,
    deleteNote,
  };
};

export default useStreamNotes;

