import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import {
  fitContainer,
  ResumableZoom,
  type ResumableZoomRefType,
  useTransformationState,
} from 'react-native-zoom-toolkit';

const SCALE_EPSILON = 1.01;
const FALLBACK_MAX_SCALE = 5;

type Props = {
  uri: string;
  width: number;
  height: number;
  isActive: boolean;
  allowPan: boolean;
  onZoomChange?: (zoomed: boolean) => void;
};

type ImageResolution = {
  width: number;
  height: number;
};

export function FullscreenZoomablePhoto({
  uri,
  width,
  height,
  isActive,
  allowPan,
  onZoomChange,
}: Props) {
  const zoomRef = useRef<ResumableZoomRefType>(null);
  const zoomedRef = useRef(false);
  const [resolution, setResolution] = useState<ImageResolution | null>(null);
  const { onUpdate: onZoomUpdate, state: zoomState } = useTransformationState('resumable');

  const notifyZoom = useCallback(
    (zoomed: boolean) => {
      if (zoomedRef.current === zoomed) return;
      zoomedRef.current = zoomed;
      onZoomChange?.(zoomed);
    },
    [onZoomChange]
  );

  useEffect(() => {
    let cancelled = false;

    setResolution(null);
    Image.getSize(
      uri,
      (imgWidth, imgHeight) => {
        if (cancelled) return;
        if (imgWidth > 0 && imgHeight > 0) {
          setResolution({ width: imgWidth, height: imgHeight });
          return;
        }
        setResolution({ width, height });
      },
      () => {
        if (!cancelled) {
          setResolution({ width, height });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [height, uri, width]);

  useEffect(() => {
    zoomRef.current?.reset(false);
    notifyZoom(false);
  }, [isActive, notifyZoom, uri]);

  useEffect(
    () => () => {
      notifyZoom(false);
    },
    [notifyZoom]
  );

  useAnimatedReaction(
    () => zoomState.scale.value > SCALE_EPSILON,
    (zoomed, previous) => {
      if (zoomed !== previous) {
        runOnJS(notifyZoom)(zoomed);
      }
    },
    [notifyZoom]
  );

  const fittedSize = useMemo(() => {
    if (!resolution || resolution.width <= 0 || resolution.height <= 0) {
      return { width, height };
    }

    return fitContainer(resolution.width / resolution.height, { width, height });
  }, [height, resolution, width]);

  if (width < 1 || height < 1) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.box, { width, height }]}>
        <Image key={uri} source={{ uri }} style={[styles.image, fittedSize]} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={[styles.box, { width, height }]}>
      <ResumableZoom
        ref={zoomRef}
        style={styles.zoomRoot}
        extendGestures
        panEnabled={allowPan}
        allowPinchPanning
        pinchEnabled
        tapsEnabled
        panMode="clamp"
        scaleMode="bounce"
        maxScale={resolution ?? FALLBACK_MAX_SCALE}
        onUpdate={onZoomUpdate}
      >
        <Image
          key={uri}
          source={{ uri }}
          style={[styles.image, fittedSize]}
          resizeMethod="scale"
          resizeMode="contain"
        />
      </ResumableZoom>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  zoomRoot: {
    width: '100%',
    height: '100%',
  },
  image: {
    backgroundColor: '#000000',
  },
});
