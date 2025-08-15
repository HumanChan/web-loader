import * as React from 'react';
import { Button } from './button';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(true);

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    const flag = saved === 'dark' || saved === null; // 默认深色主题
    setIsDark(flag);
    const root = document.documentElement;
    root.classList.toggle('dark', flag);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    root.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <Button size="sm" variant="ghost" onClick={toggle} title={isDark ? '切换浅色' : '切换深色'}>
      {isDark ? <Moon size={16}/> : <Sun size={16}/>}
    </Button>
  );
}


