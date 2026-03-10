import React, { useState, useEffect } from 'react';
import './login.css';
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth';

interface LoginModalProps {
    onSuccess: (token: string) => void;
}

export function LoginModal({ onSuccess }: LoginModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showAgreement, setShowAgreement] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle mode switch resets
    useEffect(() => {
        setError('');
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed) {
            setError('请先阅读并同意用户协议');
            return;
        }

        if (!username || !password) {
            setError('用户名或密码不能为空');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (mode === 'register') {
                const result = await authApi.register({
                    username,
                    password,
                    org_name: orgName || undefined,
                });
                useAuthStore.getState().setUser(result);
                onSuccess(result.token);
            } else {
                const result = await authApi.login({ username, password });
                useAuthStore.getState().setUser(result);
                onSuccess(result.token);
            }
        } catch (err: any) {
            setError(err.message || '操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Left Section: QR Code */}
                <div className="login-left">
                    <h2>微信扫码登录</h2>
                    <div className="login-qr-container">
                        <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=OpenClaw"
                            alt="QR Code"
                            className="login-qr-image"
                        />
                        <div className="login-qr-overlay">
                            <span>暂未开放</span>
                            <span>二维码功能建设中</span>
                        </div>
                    </div>
                    <p className="login-left-tip">使用微信扫一扫安全登录</p>
                </div>

                {/* Right Section: Form */}
                <div className="login-right">
                    <div className="login-logo-container">
                        <div className="login-logo-icon-bg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="login-logo-text">OPC数字员工</span>
                    </div>

                    <h3>{mode === 'login' ? '账号登录' : '账号注册'}</h3>

                    <form className="login-form-body" onSubmit={handleSubmit}>
                        {mode === 'register' && (
                            <div className="login-input-group">
                                <label className="login-label">组织名称</label>
                                <input
                                    type="text"
                                    className="login-input"
                                    placeholder="请输入组织名称"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="login-input-group">
                            <label className="login-label">用户名</label>
                            <input
                                type="text"
                                className="login-input"
                                placeholder="请输入用户名"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="login-input-group">
                            <label className="login-label">密码</label>
                            <input
                                type="password"
                                className="login-input"
                                placeholder="请输入密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && <div className="login-error-msg">{error}</div>}

                        <div className="login-checkbox-row">
                            <label className="login-checkbox-item">
                                <input type="checkbox" defaultChecked />
                                <span>保持账号登录状态 (7天)</span>
                            </label>
                            <button
                                type="button"
                                className="login-link-btn"
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            >
                                {mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
                            </button>
                        </div>

                        <div className="login-agreement">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                            />
                            <span>
                                我已阅读并同意
                                <button type="button" className="login-link-btn mx-1" onClick={() => setShowAgreement(true)}>《用户协议》</button>
                                和
                                <button type="button" className="login-link-btn mx-1" onClick={() => setShowAgreement(true)}>《使用须知》</button>
                            </span>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={loading}>
                            {loading ? '处理中...' : (mode === 'login' ? '登 录' : '注 册')}
                        </button>
                    </form>
                </div>
            </div>

            {/* Agreement Modal */}
            {showAgreement && (
                <div className="login-modal-overlay">
                    <div className="login-modal">
                        <div className="login-modal-header">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1677ff" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#1677ff" strokeWidth="2" />
                                <path d="M12 7V13" stroke="#1677ff" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="12" cy="16" r="1" fill="#1677ff" />
                            </svg>
                            <span>用户协议与使用须知</span>
                        </div>
                        <div className="login-modal-content">
                            <h4>欢迎使用 OPC数字员工智能助手：</h4>

                            <AgreementRule number={1} text="本系统致力于为您提供专业、高效的数字员工管理服务。" />
                            <AgreementRule number={2} text="您的数据将严格遵循加密存储标准，我们不会在未授权的情况下访问您的私有数据。" />
                            <AgreementRule number={3} text="算力积分是系统运行的核心资源，请妥善管理您的算力配额。" />
                            <AgreementRule number={4} text="严禁使用本系统从事任何违反法律法规、侵犯他人权益的行为。" />
                            <AgreementRule number={5} text="网关连接可能受网络环境影响，建议在稳定的网络环境下运行。" />
                            <AgreementRule number={6} text="使用本系统即代表您同意上述条款及后续可能的更新内容。" />
                        </div>
                        <div className="login-modal-footer">
                            <button className="login-modal-btn btn-disagree" onClick={() => { setShowAgreement(false); setAgreed(false); }}>不同意并关闭</button>
                            <button className="login-modal-btn btn-agree" onClick={() => { setShowAgreement(false); setAgreed(true); }}>同意并继续</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AgreementRule({ number, text }: { number: number, text: string }) {
    return (
        <div className="login-rule-item">
            <div className="login-rule-number">{number}</div>
            <p>{text}</p>
        </div>
    );
}
