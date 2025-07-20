// Утилиты для работы с пользователями

const USER_ID_KEY = 'gameide_user_id';

export function getUserId(): string {
  // Проверяем localStorage на наличие сохраненного ID
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    // Генерируем новый временный ID пользователя
    userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
}

export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

export function generateTempUserId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
} 