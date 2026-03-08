# 08 - 辅助页面

## 新建文件

| 文件路径 | 功能 | 优先级 |
|---------|------|--------|
| `src/pages/Shop/index.tsx` | 技能商店 | P2 |
| `src/pages/Classroom/index.tsx` | 学习课堂 | P2 |
| `src/pages/ComputePoints/index.tsx` | 算力积分 | P2 |
| `src/pages/SysSettings/index.tsx` | 系统设置 | P1 |
| `src/pages/Profile/index.tsx` | 个人资料 | P2 |

这些页面大多使用 Mock 数据，核心框架先搭好，后期接入真实数据。

---

## 1. 技能商店

### 文件: `src/pages/Shop/index.tsx`

```tsx
/**
 * Skill Shop Page
 * Displays skill cards with categories.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  desc: string;
  category: string;
  icon: string;
  price: number | 'Free';
  installed: boolean;
}

const MOCK_SKILLS: Skill[] = [
  { id: 'S1', name: '数据清洗专家', desc: '自动处理杂乱的 Excel、CSV 数据，输出标准化报表。', category: '数据分析', icon: '📊', price: 199, installed: false },
  { id: 'S2', name: '智能客服', desc: '24/7 自动回复客户咨询，支持多语言。', category: '客服', icon: '💬', price: 'Free', installed: true },
  { id: 'S3', name: '文案撰写助手', desc: '根据关键词和风格要求一键生成营销文案。', category: '创作', icon: '✍️', price: 99, installed: false },
  { id: 'S4', name: '代码审查员', desc: '自动扫描代码质量，提供优化建议和安全漏洞检测。', category: '开发', icon: '🔍', price: 299, installed: false },
  { id: 'S5', name: '会议记录员', desc: '自动转录会议录音，生成结构化会议纪要。', category: '办公', icon: '📝', price: 'Free', installed: true },
  { id: 'S6', name: '市场行情调研', desc: '实时抓取全网竞品数据，生成对比调研报告。', category: '数据分析', icon: '📈', price: 'Free', installed: false },
];

const CATEGORIES = ['全部', '数据分析', '客服', '创作', '开发', '办公'];

export function Shop() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [skills, setSkills] = useState(MOCK_SKILLS);

  const filtered = skills.filter((s) => {
    if (category !== '全部' && s.category !== category) return false;
    if (search && !s.name.includes(search) && !s.desc.includes(search)) return false;
    return true;
  });

  const handleInstall = (id: string) => {
    setSkills(skills.map((s) =>
      s.id === id ? { ...s, installed: true } : s
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">技能商店</h2>
        <p className="text-muted-foreground mt-1">为数字员工添加新技能</p>
      </div>

      {/* 搜索 + 分类 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索技能..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* 技能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((skill) => (
          <Card key={skill.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{skill.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{skill.name}</h4>
                  <Badge variant="secondary" className="text-xs shrink-0">{skill.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{skill.desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold">
                    {skill.price === 'Free' ? '免费' : `¥${skill.price}`}
                  </span>
                  <Button
                    size="sm"
                    variant={skill.installed ? 'outline' : 'default'}
                    disabled={skill.installed}
                    onClick={() => handleInstall(skill.id)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    {skill.installed ? '已安装' : '安装'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Shop;
```

---

## 2. 学习课堂

### 文件: `src/pages/Classroom/index.tsx`

```tsx
/**
 * Classroom Page
 * Course cards with level filtering.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  level: '入门' | '进阶' | '实战' | '专家';
  description: string;
  category: string;
}

const MOCK_LESSONS: Lesson[] = [
  { id: 'L1', title: '数字员工入门教程', duration: '15 min', level: '入门', description: '了解数字员工的基本概念和使用方法。', category: '基础' },
  { id: 'L2', title: '自定义 Prompt 技巧', duration: '25 min', level: '进阶', description: '掌握高效的提示词编写技巧。', category: '技巧' },
  { id: 'L3', title: '多 Agent 协作工作流', duration: '40 min', level: '实战', description: '部署多个 Agent 协同处理复杂任务。', category: '进阶' },
  { id: 'L4', title: 'API 集成开发', duration: '60 min', level: '专家', description: '使用 API 进行自定义开发和集成。', category: '开发' },
  { id: 'L5', title: '数据安全与隐私', duration: '20 min', level: '入门', description: '了解数据处理的安全规范和隐私保护策略。', category: '安全' },
  { id: 'L6', title: '飞书机器人配置', duration: '30 min', level: '进阶', description: '将数字员工接入飞书，实现自动回复和通知。', category: '集成' },
];

const LEVELS = ['全部', '入门', '进阶', '实战', '专家'];

const levelColor: Record<string, string> = {
  '入门': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '进阶': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '实战': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  '专家': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function Classroom() {
  const [level, setLevel] = useState('全部');

  const filtered = level === '全部' ? MOCK_LESSONS : MOCK_LESSONS.filter((l) => l.level === level);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">学习课堂</h2>
        <p className="text-muted-foreground mt-1">提升数字员工使用技能</p>
      </div>

      <div className="flex gap-2">
        {LEVELS.map((lv) => (
          <Button
            key={lv}
            variant={level === lv ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLevel(lv)}
          >
            {lv}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((lesson) => (
          <Card key={lesson.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
            {/* 缩略图占位 */}
            <div className="w-full h-32 rounded-lg bg-accent mb-3 flex items-center
              justify-center group-hover:bg-accent/80 transition-colors">
              <PlayCircle className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate flex-1">{lesson.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${levelColor[lesson.level] || ''}`}>
                {lesson.level}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{lesson.description}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {lesson.duration}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Classroom;
```

---

## 3. 算力积分

### 文件: `src/pages/ComputePoints/index.tsx`

```tsx
/**
 * Compute Points Page
 * Shows point balance, recharge, and usage history.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, History, CreditCard } from 'lucide-react';

const MOCK_BALANCE = 8760;
const MOCK_TOTAL = 10000;

const MOCK_LOGS = [
  { id: '1', time: '2026-03-08 14:32', agent: '通用助手', points: -120, desc: 'GPT-4o 对话' },
  { id: '2', time: '2026-03-08 10:15', agent: '数据清洗官', points: -85, desc: '数据处理任务' },
  { id: '3', time: '2026-03-07 16:45', agent: '系统', points: 500, desc: '每日签到奖励' },
  { id: '4', time: '2026-03-07 09:22', agent: '文案策划', points: -200, desc: '批量文案生成' },
  { id: '5', time: '2026-03-06 20:00', agent: '系统', points: 5000, desc: '充值 - 基础套餐' },
];

const PACKAGES = [
  { id: 'P1', name: '基础套餐', points: 5000, price: 29.9 },
  { id: 'P2', name: '专业套餐', points: 20000, price: 99.9, popular: true },
  { id: 'P3', name: '企业套餐', points: 100000, price: 399.9 },
];

export function ComputePoints() {
  const [activeTab, setActiveTab] = useState<'overview' | 'recharge' | 'history'>('overview');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">算力积分</h2>
        <p className="text-muted-foreground mt-1">管理您的 AI 算力额度</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b pb-2">
        {([
          { key: 'overview', icon: Zap, label: '概览' },
          { key: 'recharge', icon: CreditCard, label: '充值' },
          { key: 'history', icon: History, label: '记录' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(key)}
            className="gap-1.5"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* 概览 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 col-span-1 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-1">当前可用积分</p>
            <p className="text-4xl font-bold text-primary">{MOCK_BALANCE.toLocaleString()}</p>
            <div className="mt-4 h-3 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(MOCK_BALANCE / MOCK_TOTAL) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              已使用 {(MOCK_TOTAL - MOCK_BALANCE).toLocaleString()} / {MOCK_TOTAL.toLocaleString()}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">今日消耗</p>
            <p className="text-2xl font-bold">405</p>
            <Button className="w-full mt-4" onClick={() => setActiveTab('recharge')}>
              立即充值
            </Button>
          </Card>
        </div>
      )}

      {/* 充值 */}
      {activeTab === 'recharge' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`p-6 text-center hover:shadow-md transition-shadow cursor-pointer
                ${pkg.popular ? 'border-primary ring-1 ring-primary/20' : ''}`}
            >
              {pkg.popular && <Badge className="mb-2">最受欢迎</Badge>}
              <h4 className="font-semibold text-lg">{pkg.name}</h4>
              <p className="text-3xl font-bold my-3">{pkg.points.toLocaleString()}</p>
              <p className="text-muted-foreground text-sm mb-4">积分</p>
              <Button className="w-full" variant={pkg.popular ? 'default' : 'outline'}>
                ¥{pkg.price}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* 历史记录 */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-accent/50">
                <th className="text-left p-3">时间</th>
                <th className="text-left p-3">来源</th>
                <th className="text-left p-3">说明</th>
                <th className="text-right p-3">积分</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_LOGS.map((log) => (
                <tr key={log.id} className="border-b hover:bg-accent/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{log.time}</td>
                  <td className="p-3">{log.agent}</td>
                  <td className="p-3">{log.desc}</td>
                  <td className={`p-3 text-right font-mono ${log.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {log.points > 0 ? '+' : ''}{log.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default ComputePoints;
```

---

## 4. 系统设置

### 文件: `src/pages/SysSettings/index.tsx`

```tsx
/**
 * System Settings Page
 * Theme, language, gateway config, and developer mode.
 */
import { useSettingsStore } from '@/stores/settings';
import { useGatewayStore } from '@/stores/gateway';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor, RefreshCw } from 'lucide-react';

export function SysSettings() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const uiMode = useSettingsStore((s) => s.uiMode);
  const setUiMode = useSettingsStore((s) => s.setUiMode);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const restartGateway = useGatewayStore((s) => s.restart);

  const themes = [
    { value: 'light' as const, icon: Sun, label: '浅色' },
    { value: 'dark' as const, icon: Moon, label: '深色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
        <p className="text-muted-foreground mt-1">配置应用偏好</p>
      </div>

      {/* 外观 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">外观</h3>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">主题</Label>
            <div className="flex gap-2">
              {themes.map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(value)}
                  className="gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Gateway 状态 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Gateway 连接</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">状态：
              <span className={gatewayStatus === 'running'
                ? 'text-green-500 font-medium'
                : 'text-yellow-500 font-medium'
              }>
                {gatewayStatus === 'running' ? '运行中' : gatewayStatus}
              </span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={restartGateway} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            重启
          </Button>
        </div>
      </Card>

      {/* 开发者选项 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">开发者选项</h3>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            按 <kbd className="px-1.5 py-0.5 rounded bg-accent text-xs font-mono">Ctrl+P</kbd> 可随时切换到经典 ClawX 界面。
          </p>
          <p className="text-sm">
            当前模式：<span className="font-medium">{uiMode === 'new' ? '新版界面' : '经典界面'}</span>
          </p>
          <Button
            variant="outline"
            onClick={() => setUiMode(uiMode === 'new' ? 'classic' : 'new')}
          >
            切换到{uiMode === 'new' ? '经典' : '新版'}界面
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default SysSettings;
```

> **注意**: 此页面引用了 `settings.ts` 中的 `uiMode` 和 `setUiMode`——这需要先在 settings store 中添加（见 03-app-routing.md 方式 A）。

---

## 5. 个人资料

### 文件: `src/pages/Profile/index.tsx`

```tsx
/**
 * Profile Page
 * User information display.
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Profile() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">个人资料</h2>
        <p className="text-muted-foreground mt-1">管理您的账户信息</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <h3 className="font-semibold">本地用户</h3>
            <p className="text-sm text-muted-foreground">本地模式运行中</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value="Local User" readOnly />
          </div>
          <div className="space-y-2">
            <Label>运行模式</Label>
            <Input value="本地桌面版" readOnly />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            当前为本地模式，数据存储在本机。如需云端同步，请联系管理员。
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Profile;
```

---

## 导出说明

每个页面文件都使用 **named export + default export** 双模式，兼容两种导入方式：

```typescript
// Named import
import { Shop } from '@/pages/Shop';

// Default import
import Shop from '@/pages/Shop';
```
