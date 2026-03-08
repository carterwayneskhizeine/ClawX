export enum EmployeeStatus {
    IDLE = 'IDLE',
    BUSY = 'BUSY',
    OFFLINE = 'OFFLINE'
}

export interface DigitalEmployee {
    id: string;
    name: string;
    avatar: string;
    emoji?: string;
    theme?: string;
    currentTask: string;
    status: EmployeeStatus;
}

export interface ComputeLog {
    id: string;
    taskName: string;
    startTime: string;
    endTime: string;
    duration: string;
    points: number;
    remainingPoints?: number;
}

export interface User {
    id: string;
    username: string;
    accountName: string;
    avatar: string;
    wechatBound: boolean;
    points: number;
    totalPoints: number;
}

export type ViewType = 'home' | 'employees' | 'shop' | 'classroom' | 'points' | 'settings' | 'profile';
