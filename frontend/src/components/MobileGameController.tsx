import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MobileGameControllerProps {
  onAction: (action: string, state: 'start' | 'end' | 'move', data?: any) => void;
  gameType?: 'platformer' | 'arcade' | 'puzzle';
  isVisible?: boolean;
  opacity?: number;
  position?: 'bottom' | 'overlay';
}

interface TouchPosition {
  x: number;
  y: number;
  identifier: number;
}

const MobileGameController: React.FC<MobileGameControllerProps> = ({
  onAction,
  gameType = 'platformer',
  isVisible = true,
  opacity = 0.7,
  position = 'bottom'
}) => {
  const [activeTouches, setActiveTouches] = useState<Set<string>>(new Set());
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);

  // Обработка джойстика
  const handleJoystickStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    setActiveTouches(prev => new Set([...prev, 'joystick']));
    onAction('joystick', 'start', { x: 0, y: 0 });
  }, [onAction]);

  const handleJoystickMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!activeTouches.has('joystick')) return;

    const touch = event.touches[0];
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width / 2 - 20;

    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    const normalizedX = deltaX / maxDistance;
    const normalizedY = deltaY / maxDistance;

    setJoystickPosition({ x: deltaX, y: deltaY });
    onAction('joystick', 'move', { x: normalizedX, y: normalizedY });
  }, [activeTouches, onAction]);

  const handleJoystickEnd = useCallback(() => {
    setActiveTouches(prev => {
      const newSet = new Set(prev);
      newSet.delete('joystick');
      return newSet;
    });
    setJoystickPosition({ x: 0, y: 0 });
    onAction('joystick', 'end', { x: 0, y: 0 });
  }, [onAction]);

  // Обработка кнопок
  const handleButtonStart = useCallback((buttonId: string) => {
    setActiveTouches(prev => new Set([...prev, buttonId]));
    onAction(buttonId, 'start');
  }, [onAction]);

  const handleButtonEnd = useCallback((buttonId: string) => {
    setActiveTouches(prev => {
      const newSet = new Set(prev);
      newSet.delete(buttonId);
      return newSet;
    });
    onAction(buttonId, 'end');
  }, [onAction]);

  // Предотвращение скролла при касании контроллера
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if ((e.target as Element)?.closest('.mobile-controller')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventDefault, { passive: false });
    document.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventDefault);
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  if (!isVisible) return null;

  const getControlsForGameType = () => {
    switch (gameType) {
      case 'platformer':
        return {
          left: [
            { id: 'jump', label: 'A', icon: '⬆️' },
            { id: 'action', label: 'B', icon: '⚡' }
          ],
          right: [
            { id: 'run', label: 'X', icon: '🏃' },
            { id: 'duck', label: 'Y', icon: '⬇️' }
          ]
        };
      case 'arcade':
        return {
          left: [
            { id: 'shoot', label: 'A', icon: '💥' },
            { id: 'special', label: 'B', icon: '✨' }
          ],
          right: [
            { id: 'bomb', label: 'X', icon: '💣' },
            { id: 'shield', label: 'Y', icon: '🛡️' }
          ]
        };
      case 'puzzle':
        return {
          left: [
            { id: 'select', label: 'A', icon: '👆' },
            { id: 'rotate', label: 'B', icon: '🔄' }
          ],
          right: [
            { id: 'hint', label: 'X', icon: '💡' },
            { id: 'undo', label: 'Y', icon: '↩️' }
          ]
        };
      default:
        return { left: [], right: [] };
    }
  };

  const controls = getControlsForGameType();

  const buttonClass = (buttonId: string) => 
    `w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg transform transition-all duration-150 select-none ${
      activeTouches.has(buttonId)
        ? 'scale-95 bg-blue-700 shadow-inner'
        : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
    }`;

  return (
    <div 
      className={`mobile-controller fixed inset-x-0 ${
        position === 'bottom' ? 'bottom-0' : 'bottom-20'
      } pointer-events-none z-50`}
      style={{ opacity }}
    >
      <div className="flex justify-between items-end p-4 pointer-events-auto">
        {/* Левая сторона: джойстик */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            {/* Джойстик */}
            <div
              ref={joystickBaseRef}
              className="w-24 h-24 bg-gray-800/50 rounded-full border-4 border-gray-600/50 flex items-center justify-center"
              onTouchStart={handleJoystickStart}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
            >
              <div
                ref={joystickRef}
                className={`w-10 h-10 bg-blue-500 rounded-full shadow-lg transition-all duration-100 ${
                  activeTouches.has('joystick') ? 'bg-blue-600' : ''
                }`}
                style={{
                  transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`
                }}
              />
            </div>
          </div>

          {/* Левые кнопки */}
          <div className="flex flex-col space-y-3">
            {controls.left.map((button) => (
              <button
                key={button.id}
                className={buttonClass(button.id)}
                onTouchStart={() => handleButtonStart(button.id)}
                onTouchEnd={() => handleButtonEnd(button.id)}
                onTouchCancel={() => handleButtonEnd(button.id)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-lg">{button.icon}</span>
                  <span className="text-xs">{button.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Правая сторона: кнопки действий */}
        <div className="flex items-center space-x-4">
          {/* Правые кнопки */}
          <div className="flex flex-col space-y-3">
            {controls.right.map((button) => (
              <button
                key={button.id}
                className={buttonClass(button.id)}
                onTouchStart={() => handleButtonStart(button.id)}
                onTouchEnd={() => handleButtonEnd(button.id)}
                onTouchCancel={() => handleButtonEnd(button.id)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-lg">{button.icon}</span>
                  <span className="text-xs">{button.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Дополнительные кнопки */}
          <div className="flex flex-col space-y-3">
            <button
              className={`${buttonClass('pause')} bg-orange-600`}
              onTouchStart={() => handleButtonStart('pause')}
              onTouchEnd={() => handleButtonEnd('pause')}
              onTouchCancel={() => handleButtonEnd('pause')}
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">⏸️</span>
                <span className="text-xs">P</span>
              </div>
            </button>
            
            <button
              className={`${buttonClass('menu')} bg-gray-600`}
              onTouchStart={() => handleButtonStart('menu')}
              onTouchEnd={() => handleButtonEnd('menu')}
              onTouchCancel={() => handleButtonEnd('menu')}
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">☰</span>
                <span className="text-xs">M</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* D-Pad для игр где нужны точные направления */}
      {gameType === 'puzzle' && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <div className="relative w-32 h-32">
            {/* D-Pad */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-24 h-24">
                {/* Вверх */}
                <button
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-700 rounded-t-lg flex items-center justify-center text-white"
                  onTouchStart={() => handleButtonStart('up')}
                  onTouchEnd={() => handleButtonEnd('up')}
                >
                  ↑
                </button>
                {/* Вниз */}
                <button
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-700 rounded-b-lg flex items-center justify-center text-white"
                  onTouchStart={() => handleButtonStart('down')}
                  onTouchEnd={() => handleButtonEnd('down')}
                >
                  ↓
                </button>
                {/* Влево */}
                <button
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-700 rounded-l-lg flex items-center justify-center text-white"
                  onTouchStart={() => handleButtonStart('left')}
                  onTouchEnd={() => handleButtonEnd('left')}
                >
                  ←
                </button>
                {/* Вправо */}
                <button
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-700 rounded-r-lg flex items-center justify-center text-white"
                  onTouchStart={() => handleButtonStart('right')}
                  onTouchEnd={() => handleButtonEnd('right')}
                >
                  →
                </button>
                {/* Центр */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileGameController; 