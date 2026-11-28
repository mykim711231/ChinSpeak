import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useResumeNav } from '../hooks/useResumeNav';

const items = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/path', label: '경로', icon: 'map' },
  { to: '/search', label: '검색', icon: 'search' },
  { to: '/study', label: '학습', icon: 'target' },
  { to: '/settings', label: '설정', icon: 'settings' },
];

const STUDY = /^\/(study|flashcards|daily|passive|review|lesson\/[^/]+\/(?:mastery|practice))/;

export default function BottomNav() {
  const { pathname } = useLocation();
  const { navRef, revision } = useResumeNav();

  return (
    <nav key={revision} ref={navRef} data-app-bottom-nav aria-label="하단 메뉴" className="fixed bottom-0 inset-x-0 z-30 [transform:translateZ(0)] bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-xl flex">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            aria-label={i.to === '/search' ? '표현 검색' : undefined}
            end={i.to === '/'}
            className={({ isActive }) =>
              `flex-1 py-2 text-center text-xs ${isActive || (i.to === '/study' && STUDY.test(pathname)) ? 'text-brand font-semibold' : 'text-slate-500'}`
            }
          >
            <Icon name={i.icon} className="mx-auto mb-0.5" size={22} />
            {i.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
