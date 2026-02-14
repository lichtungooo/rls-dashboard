/**
 * TopNavigation - Schwebende Navigation oben auf der Karte
 * Links: Logo/Spaces
 * Mitte: Module (scrollbar wenn mehr als 3)
 * Rechts: Profil/Login/Settings
 */

import { ReactNode } from 'react';
import { FloatingCard } from './FloatingCard';

export interface NavModule {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
  onClick: () => void;
}

interface TopNavigationProps {
  /**
   * Logo oder Space-Name
   */
  logo?: ReactNode;
  /**
   * Module in der Mitte
   */
  modules: NavModule[];
  /**
   * Profil-Bereich rechts
   */
  profile?: ReactNode;
}

export function TopNavigation({ logo, modules, profile }: TopNavigationProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <FloatingCard padding="small" shadow="large" rounded="large" backgroundOpacity={98}>
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo / Space */}
          <div className="flex-shrink-0">
            {logo || (
              <div className="flex items-center gap-2 px-2">
                <span className="text-xl">🗺️</span>
                <span className="font-semibold text-gray-800">Real Life Stack</span>
              </div>
            )}
          </div>

          {/* Center: Modules (scrollable wenn zu viele) */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 justify-center px-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={module.onClick}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-150 whitespace-nowrap
                    ${
                      module.active
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {module.icon && <span className="mr-1">{module.icon}</span>}
                  {module.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Profile / Login */}
          <div className="flex-shrink-0">
            {profile || (
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-xl">👤</span>
                <span className="font-medium text-gray-700 hidden md:inline">Profil</span>
              </button>
            )}
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}
