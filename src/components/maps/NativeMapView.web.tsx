import React from 'react';
import { View } from 'react-native';

const NativeMapViewWebFallback = React.forwardRef<View, Record<string, unknown>>(
  function NativeMapViewWebFallback(_props, ref) {
    return <View ref={ref} />;
  }
);

export default NativeMapViewWebFallback;
