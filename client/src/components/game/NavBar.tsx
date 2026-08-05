import { Crosshair, Building2, Users, FlaskConical, Target } from "lucide-react";

export type GameView = 'shoot' | 'base' | 'heroes' | 'research' | 'missions';

interface NavBarProps {
  currentView: GameView;
  onViewChange: (view: GameView) => void;
}

const tabs: { id: GameView; label: string; icon: React.ReactNode }[] = [
  { id: 'shoot', label: '出撃', icon: <Crosshair size={20} /> },
  { id: 'base', label: '基地', icon: <Building2 size={20} /> },
  { id: 'heroes', label: '英雄', icon: <Users size={20} /> },
  { id: 'research', label: '研究', icon: <FlaskConical size={20} /> },
  { id: 'missions', label: '任務', icon: <Target size={20} /> },
];

export default function NavBar({ currentView, onViewChange }: NavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A1F25]/95 backdrop-blur-sm border-t border-[#39FF14]/20">
      <div className="flex justify-around items-center h-14">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-200 ${
              currentView === tab.id
                ? 'text-[#39FF14] scale-110'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
