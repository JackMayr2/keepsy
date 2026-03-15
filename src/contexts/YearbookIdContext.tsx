import React, { createContext, useContext, ReactNode } from 'react';

const YearbookIdContext = createContext<string | undefined>(undefined);

export function YearbookIdProvider({
  yearbookId,
  children,
}: {
  yearbookId: string | undefined;
  children: ReactNode;
}) {
  return (
    <YearbookIdContext.Provider value={yearbookId}>
      {children}
    </YearbookIdContext.Provider>
  );
}

export function useYearbookId(): string | undefined {
  return useContext(YearbookIdContext);
}
