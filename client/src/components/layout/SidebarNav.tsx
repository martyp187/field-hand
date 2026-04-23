import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  label: string;
  icon?: string;
}

export function NavItem({ to, label, icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )
      }
    >
      {icon && <span className="text-base leading-none">{icon}</span>}
      {label}
    </NavLink>
  );
}
