import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, YStackProps } from 'tamagui';

type PageProps = YStackProps & {
  scroll?: boolean;
};

export function Page({ scroll, children, ...rest }: PageProps) {
  const content = (
    <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4" paddingTop="$4" {...rest}>
      {children}
    </YStack>
  );

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4" paddingTop="$4" minHeight="100%" {...rest}>
          {children}
        </YStack>
      </ScrollView>
    );
  }

  return content;
}
