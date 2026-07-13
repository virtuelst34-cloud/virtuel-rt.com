import React, { useState, useRef, useEffect, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { Smile, Send, X, Reply, AlertCircle } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';
import { useUser, useTyping, useSalons, useNotifications } from '@/lib/contexts';
import { validateMessage, type MessageInput } from '@/lib/validation';
import { detectSpam } from '@/lib/antiSpam';

interface Member {
  name: string;
}

interface Message {
  author_name: string;
  text: string;
}

interface ChatInputProps {
  onSend: (text: string, image: string | null, replyTo: Message | null, file?: File | null) => void;
  onTyping?: () => void;
  disabled?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  members?: Member[];
}

export default function ChatInput({ onSend, onTyping, disabled = false, replyTo = null, onCancelReply, members = [] }: ChatInputProps) {
  const { profiles, user } = useUser();
  const { currentSalon } = useSalons();
  const { setTyping } = useTyping();
  const { addNotification } = useNotifications();
  const [text, setText]               = useState('');
  const [showEmojis, setShowEmojis]   = useState(false);
  const [mentions, setMentions]       = useState<string[]>([]); // suggestions @
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const caretRef  = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Construire la liste des gens mentionnables
  const allNames = [...new Set([
    ...members.map(m => m.name),
    ...Object.keys(profiles),
  ])];

  // Détecter @ dans le texte
  const detectMention = useCallback((val: string, pos: number) => {
    const before = val.slice(0, pos);
    const match  =  before.match(/@([\p{L}\p{N}_]*)$/u);
    if (match) {
      const q = match[1].toLowerCase();
      const suggestions = allNames.filter(n => n.toLowerCase().startsWith(q) && n.toLowerCase() !== '').slice(0, 5);
      setMentionQuery(match[1]);
      setMentions(suggestions);
      setMentionIndex(0);
    } else {
      setMentions([]);
      setMentionQuery('');
    }
  }, [allNames]);

  const insertMention = useCallback((name: string) => {
    const pos    = caretRef.current;
    const before = text.slice(0, pos);
    const after  = text.slice(pos);
    const atPos  = before.lastIndexOf('@');
    const newText = before.slice(0, atPos) + `@${name} ` + after;
    setText(newText);
    setMentions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [text]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    caretRef.current = pos;
    setText(val);
    detectMention(val, pos);
    onTyping?.();
    
    // Trigger typing indicator
    if (user && currentSalon && val.trim()) {
      setTyping(currentSalon, user.name, true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(currentSalon, user.name, false);
      }, 3000);
    }
    
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && mentions.length > 0)) {
        e.preventDefault(); insertMention(mentions[mentionIndex]); return;
      }
      if (e.key === 'Escape') { setMentions([]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    // Clear previous validation error
    setValidationError(null);

    // Validate message input
    const messageInput: MessageInput = {
      text: text,
      image: selectedImage,
      replyTo: replyTo || null,
    };

    const validation = validateMessage(messageInput);
    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    if ((!text.trim() && !selectedImage && !selectedFile) || disabled) return;

    // Spam detection
    if (user) {
      const spamCheck = detectSpam(user.name, text.trim());
      if (spamCheck.isSpam) {
        if (spamCheck.warningMessage) {
          addNotification({
            type: 'block',
            message: spamCheck.warningMessage
          });
        }
        return;
      }
    }

    onSend(text.trim(), selectedImage, replyTo || null, selectedFile);
    setText('');
    setSelectedImage(null);
    setSelectedFile(null);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setMentions([]);
    if (onCancelReply) onCancelReply();
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
  };

  const setFilePreview = (file: File) => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setSelectedImage(null);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      addNotification({ type: 'block', message: 'Le fichier ne doit pas dépasser 5MB' });
      return;
    }

    setFilePreview(file);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      addNotification({ type: 'block', message: 'Le fichier ne doit pas dépasser 5MB' });
      return;
    }

    setFilePreview(file);
    setShowFileUpload(false);
  };

  const removeImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Focus auto quand replyTo change
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  return (
    <div className="border-t border-border bg-card px-4 py-2.5 shrink-0 relative" role="region" aria-label="Zone de saisie de message">

      {/* Suggestions @ */}
      {mentions.length > 0 && (
        <div 
          className="absolute bottom-full left-4 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20 min-w-[180px]"
          role="listbox"
          aria-label="Suggestions de mentions"
          aria-activedescendant={`mention-${mentionIndex}`}
        >
          {mentions.map((name, i) => (
            <button 
              key={name} 
              id={`mention-${i}`}
              onClick={() => insertMention(name)}
              role="option"
              aria-selected={i === mentionIndex}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors ${i === mentionIndex ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-foreground'}`}>
              <span className="text-primary font-bold">@</span>{name}
            </button>
          ))}
        </div>
      )}

      {/* Réponse en cours */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-secondary border border-border rounded-xl" role="region" aria-live="polite" aria-label="Réponse en cours">
          <Reply className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-primary font-semibold">Réponse à {replyTo.author_name}</span>
            <p className="text-[11px] text-muted-foreground/60 truncate">{replyTo.text}</p>
          </div>
          <button 
            onClick={onCancelReply!} 
            className="text-muted-foreground/40 hover:text-foreground transition-colors"
            aria-label="Annuler la réponse"
            title="Annuler la réponse">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Prévisualisation de l'image */}
      {imagePreview && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-secondary border border-border rounded-xl" role="region" aria-live="polite" aria-label="Prévisualisation de l'image">
          <img src={imagePreview} alt="Aperçu de l'image à envoyer" className="w-12 h-12 object-cover rounded-lg" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-primary font-semibold">Image sélectionnée</span>
            <p className="text-[11px] text-muted-foreground/60 truncate">Prête à envoyer</p>
          </div>
          <button 
            onClick={removeImage} 
            className="text-muted-foreground/40 hover:text-foreground transition-colors"
            aria-label="Supprimer l'image"
            title="Supprimer l'image">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Erreur de validation */}
      {validationError && (
        <div 
          className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl"
          role="alert"
          aria-live="assertive"
          aria-label="Erreur de validation">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-red-400">{validationError}</span>
          <button 
            onClick={() => setValidationError(null)} 
            className="text-red-400/60 hover:text-red-400 transition-colors"
            aria-label="Fermer l'erreur"
            title="Fermer">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {showEmojis && !disabled && (
        <EmojiPicker 
          onSelect={em => { setText(p => p + em); inputRef.current?.focus(); }} 
          onClose={() => setShowEmojis(false)} 
        />
      )}

      {showFileUpload && !disabled && (
        <div className="absolute bottom-full left-4 mb-2 z-20">
          <FileUpload 
            onFileSelect={handleFileSelect}
            maxSize={5}
            acceptedTypes={['image/*', '.pdf', '.doc', '.docx']}
          />
        </div>
      )}

      <div 
        className={`flex items-end gap-2 bg-secondary border rounded-xl px-2 py-1.5 transition-all duration-200 ${disabled ? 'opacity-50 border-border' : 'border-white/10 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10'}`}
        role="group"
        aria-label="Formulaire d'envoi de message">
        <button 
          onClick={(e) => { e.stopPropagation(); if (!disabled) setShowFileUpload(!showFileUpload); }}
          disabled={disabled}
          className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:pointer-events-none ${showFileUpload ? 'bg-primary/20 text-primary' : 'text-muted-foreground/60 hover:bg-white/[0.06] hover:text-muted-foreground'}`}
          aria-label={showFileUpload ? "Fermer le sélecteur de fichiers" : "Ouvrir le sélecteur de fichiers"}
          aria-expanded={showFileUpload}
          aria-haspopup="dialog"
          title="Fichiers">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); if (!disabled) setShowEmojis(!showEmojis); }}
          disabled={disabled}
          className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:pointer-events-none ${showEmojis ? 'bg-primary/20 text-primary' : 'text-muted-foreground/60 hover:bg-white/[0.06] hover:text-muted-foreground'}`}
          aria-label={showEmojis ? "Fermer le sélecteur d'emojis" : "Ouvrir le sélecteur d'emojis"}
          aria-expanded={showEmojis}
          aria-haspopup="dialog"
          title="Emojis">
          <Smile className="w-4 h-4" aria-hidden="true" />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={e => { caretRef.current = (e.target as HTMLTextAreaElement).selectionStart || 0; }}
          disabled={disabled}
          placeholder={disabled ? 'Vous ne pouvez pas envoyer de messages.' : 'Envoyer un message... (@ pour mentionner)'}
          rows={1}
          aria-label="Message"
          aria-describedby={mentions.length > 0 ? 'mention-suggestions' : undefined}
          aria-autocomplete="list"
          aria-controls={mentions.length > 0 ? 'mention-suggestions' : undefined}
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/40 resize-none min-h-[22px] max-h-[120px] leading-relaxed py-0.5 disabled:cursor-not-allowed transition-all duration-200"
          style={{ height: 'auto' }}
        />
        <button 
          onClick={handleSend} 
          disabled={!text.trim() || disabled}
          className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 disabled:bg-secondary disabled:text-muted-foreground/40 hover:bg-primary/80 transition-all duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100"
          aria-label="Envoyer le message"
          aria-disabled={!text.trim() || disabled}
          title="Envoyer">
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
