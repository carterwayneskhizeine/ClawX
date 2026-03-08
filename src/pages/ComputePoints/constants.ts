import { EmployeeStatus } from './types';
import type { DigitalEmployee, ComputeLog, User } from './types';

export const MOCK_USER: User = {
    id: 'user-001',
    username: 'Senior Architect 01',
    accountName: 'admin_openclaw',
    avatar: 'https://picsum.photos/seed/user/200',
    wechatBound: true,
    points: 12450,
    totalPoints: 50000
};

export const MOCK_EMPLOYEES: DigitalEmployee[] = [
    { id: 'main', name: '通用助手', avatar: 'https://picsum.photos/seed/main/200', currentTask: '在线', status: EmployeeStatus.IDLE },
];

const generateMockLogs = (): ComputeLog[] => {
    const logs: ComputeLog[] = [];
    let currentRemaining = MOCK_USER.points;
    const tasks = ['生成市场调研报告', '代码重构建议', '翻译2万字技术文档', 'SQL 性能优化', '季度KPI数据分析', '撰写产品PRD', '设计系统架构图', '排查线上Bug', '分析竞品数据', '生成测试用例'];

    for (let i = 0; i < 50; i++) {
        const points = Math.floor(Math.random() * 500) + 10;
        const duration = Math.floor(Math.random() * 60) + 1;
        const taskName = tasks[Math.floor(Math.random() * tasks.length)];

        logs.push({
            id: `L${i + 1}`,
            taskName,
            startTime: `2023-10-${27 - Math.floor(i / 5)} 10:00`,
            endTime: `2023-10-${27 - Math.floor(i / 5)} 10:${duration < 10 ? '0' + duration : duration}`,
            duration: `${duration}min`,
            points,
            remainingPoints: currentRemaining
        });
        currentRemaining += points; // Reverse calculation since we are going back in time
    }
    return logs;
};

export const MOCK_COMPUTE_LOGS: ComputeLog[] = generateMockLogs();

export const RECHARGE_PLANS = [
    { id: 'P1', points: 1000, price: 9.9 },
    { id: 'P2', points: 5000, price: 45 },
    { id: 'P3', points: 12000, price: 99 },
    { id: 'P4', points: 30000, price: 199 }
];
