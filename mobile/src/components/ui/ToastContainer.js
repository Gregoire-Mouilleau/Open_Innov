import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useToast } from '../../context/ToastContext';

const SUCCESS_BG = '#1a5c35';
const DEFAULT_BG = '#e8874a';

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function ToastItem({ toast, onDismiss, onExited }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(40)).current;

  // Entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  // Sortie progressive quand dying passe à true
  useEffect(() => {
    if (!toast.dying) return;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 40, duration: 300, useNativeDriver: true }),
    ]).start(() => onExited(toast.id));
  }, [toast.dying]);

  const bg = toast.variant === 'success' ? SUCCESS_BG : DEFAULT_BG;
  const icon = ICONS[toast.variant] ?? ICONS.error;

  return (
    <Animated.View style={[st.toast, { backgroundColor: bg, opacity, transform: [{ translateX }] }]}>
      <View style={st.iconWrap}>
        <Text style={st.icon}>{icon}</Text>
      </View>
      <Text style={st.msg} numberOfLines={3}>{toast.message}</Text>
      <Pressable onPress={() => onDismiss(toast.id)} hitSlop={10} style={st.close}>
        <Text style={st.closeIcon}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const { toasts, dismiss, exited } = useToast();
  if (!toasts.length) return null;

  return (
    <View style={st.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} onExited={exited} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    right: 16,
    zIndex: 9999,
    alignItems: 'flex-end',
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 300,
    minHeight: 52,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconWrap: {
    width: 22,
    alignItems: 'center',
    marginRight: 10,
  },
  icon: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  msg: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
  },
  close: {
    marginLeft: 8,
  },
  closeIcon: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '300',
  },
});
