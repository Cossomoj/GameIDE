import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamesApi } from '@/services/api';
import { Game, CreateGameRequest } from '@/types';
import toast from 'react-hot-toast';

// Hook для получения списка игр
export const useGames = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['games', params],
    queryFn: () => gamesApi.getAll(params),
    staleTime: 10000, // 10 секунд
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });
};

// Hook для получения конкретной игры
export const useGame = (id: string | undefined) => {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.getById(id!),
    enabled: !!id,
    staleTime: 5000, // 5 секунд
    refetchInterval: (data) => {
      // Обновляем чаще если игра в процессе генерации
      if (data?.status === 'processing' || data?.status === 'queued') {
        return 5000; // 5 секунд
      }
      return 30000; // 30 секунд для завершенных игр
    },
  });
};

// Hook для получения статуса игры
export const useGameStatus = (id: string | undefined) => {
  return useQuery({
    queryKey: ['gameStatus', id],
    queryFn: () => gamesApi.getStatus(id!),
    enabled: !!id,
    staleTime: 1000, // 1 секунда
    refetchInterval: 2000, // Обновляем каждые 2 секунды
  });
};

// Hook для создания игры
export const useCreateGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameData: CreateGameRequest) => gamesApi.create(gameData),
    onSuccess: (game: Game) => {
      // Обновляем кеш списка игр
      queryClient.invalidateQueries({ queryKey: ['games'] });
      
      toast.success(`Игра "${game.title}" добавлена в очередь генерации!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка создания игры');
    },
  });
};

// Hook для удаления игры
export const useDeleteGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gamesApi.delete(id),
    onSuccess: () => {
      // Обновляем кеш
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Игра удалена');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка удаления игры');
    },
  });
};

// Hook для отмены генерации игры
export const useCancelGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gamesApi.cancel(id),
    onSuccess: () => {
      // Обновляем кеш
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['game'] });
      toast.success('Генерация игры отменена');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка отмены генерации');
    },
  });
};

// Hook для скачивания игры
export const useDownloadGame = () => {
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const blob = await gamesApi.download(id);
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-zA-Z0-9а-яё\s]/gi, '')}_game.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return blob;
    },
    onSuccess: () => {
      toast.success('Скачивание началось!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка скачивания игры');
    },
  });
}; 