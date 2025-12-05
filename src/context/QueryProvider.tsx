"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Создание QueryClient с оптимальными настройками
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Время жизни кэша - 5 минут
        staleTime: 5 * 60 * 1000,
        // Время хранения в кэше - 10 минут
        gcTime: 10 * 60 * 1000,
        // Повторные запросы при ошибках
        retry: 2,
        // Интервал между повторными запросами
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Рефетч при фокусе окна
        refetchOnWindowFocus: false,
        // Рефетч при переподключении
        refetchOnReconnect: true,
      },
      mutations: {
        // Повторные попытки для мутаций
        retry: 1,
      },
    },
  });
};

let clientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: всегда создаем новый query client
    return createQueryClient();
  } else {
    // Browser: создаем query client только один раз
    if (!clientSingleton) {
      clientSingleton = createQueryClient();
    }
    return clientSingleton;
  }
};

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
