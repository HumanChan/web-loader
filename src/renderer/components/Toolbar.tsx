import * as React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, Globe } from 'lucide-react';
import { ThemeToggle } from './ui/theme-toggle';
import { toast } from 'sonner';
import { IPC } from '../../shared/ipc';

interface Props {
  url: string;
  setUrl: (v: string) => void;
  onNavigated: (finalUrl: string, partition?: string) => void;
  setIsRunning: (v: boolean) => void;
  setTimerMs: (v: number) => void;
  setExportDir: (v: string) => void;
  setExportProgress: (v: any) => void;
}

export function Toolbar({ url, setUrl, onNavigated, setIsRunning, setTimerMs }: Props) {
  const [isNavigating, setIsNavigating] = React.useState(false);
  
  const handleNavigate = async () => {
    if (!url.trim()) {
      toast.error('请输入有效的 URL');
      return;
    }
    
    setIsNavigating(true);
    try {
      const raw = url.trim();
      const finalUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const res = await (window as any).api.invoke(IPC.NavigateTo, { url: finalUrl });
      onNavigated(finalUrl, res?.partition);
      setTimerMs(0);
      setIsRunning(true);
      toast.success('页面跳转成功', {
        description: finalUrl,
      });
    } catch (error) {
      toast.error('页面跳转失败', {
        description: '请检查 URL 是否正确',
      });
    } finally {
      setIsNavigating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <div className="flex h-14 items-center gap-3 border-b border-border px-4 bg-background">
      <div className="flex items-center gap-2 flex-1">
        <Globe size={16} className="text-muted-foreground" />
        <Input
          className="flex-1 h-9"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入网站 URL..."
          disabled={isNavigating}
        />
        {url && (
          <Badge variant="secondary" className="text-xs">
            {url.startsWith('https://') ? 'HTTPS' : url.startsWith('http://') ? 'HTTP' : 'URL'}
          </Badge>
        )}
      </div>
      <Button 
        size="sm" 
        onClick={handleNavigate}
        disabled={!url.trim() || isNavigating}
      >
        <Search size={16}/> 
        {isNavigating ? '跳转中...' : '跳转'}
      </Button>
      <ThemeToggle />
    </div>
  );
}


