import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ErrorType, setGlobalErrorHandler } from '../services/api';

const ToastContext = createContext(null);

let _toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  // Déclenche l'animation de sortie (dying:true) — le composant appelle exited() quand c'est fini
  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, dying: true } : t));
  }, []);

  // Appelé par ToastItem après la fin de l'animation de sortie
  const exited = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, variant = 'error', duration = 4000) => {
    const id = ++_toastCounter;
    setToasts((prev) => [...prev.slice(-4), { id, message, variant, dying: false }]);
    timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const showApiError = useCallback((err) => {
    const labels = {
      [ErrorType.NETWORK]:      { msg: 'Serveur injoignable — vérifiez votre connexion', variant: 'error' },
      [ErrorType.TIMEOUT]:      { msg: 'Requête expirée — réessayez', variant: 'warning' },
      [ErrorType.UNAUTHORIZED]: { msg: 'Session expirée — reconnectez-vous', variant: 'warning' },
      [ErrorType.FORBIDDEN]:    { msg: 'Accès refusé', variant: 'error' },
      [ErrorType.NOT_FOUND]:    { msg: 'Ressource introuvable', variant: 'info' },
      [ErrorType.SERVER]:       { msg: 'Erreur serveur — réessayez plus tard', variant: 'error' },
      [ErrorType.UNKNOWN]:      { msg: err.message ?? 'Une erreur est survenue', variant: 'error' },
    };
    const { msg, variant } = labels[err.type] ?? labels[ErrorType.UNKNOWN];
    show(msg, variant);
  }, [show]);

  // Branche le gestionnaire global dès que le provider est monté
  useEffect(() => {
    setGlobalErrorHandler(showApiError);
    return () => setGlobalErrorHandler(null);
  }, [showApiError]);

  return (
    <ToastContext.Provider value={{ show, showApiError, dismiss, exited, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider');
  return ctx;
}
