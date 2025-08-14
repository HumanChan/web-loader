import * as React from 'react';
import { Button } from './button';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isLight, setIsLight] = React.useState<boolean>(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    const flag = saved === 'light';
    setIsLight(flag);
    const root = document.documentElement;
    root.classList.toggle('theme-light', flag);
  }, []);

  const toggle = () => {
    const next = !isLight;
    setIsLight(next);
    const root = document.documentElement;
    root.classList.toggle('theme-light', next);
    localStorage.setItem('theme', next ? 'light' : 'dark');
  };

  return (
    <Button size="sm" variant="ghost" onClick={toggle} title={isLight ? '切换深色' : '切换浅色'}>
      {isLight ? <Sun size={16}/> : <Moon size={16}/>}
    </Button>
  );
}


