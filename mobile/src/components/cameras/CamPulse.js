import React from 'react';
import { View } from 'react-native';

export default function CamPulse() {
  const [big, setBig] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setBig(v => !v), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{
      width: big ? 7 : 5, height: big ? 7 : 5, borderRadius: 4,
      backgroundColor: '#e74c3c', opacity: big ? 1 : 0.55,
    }} />
  );
}
