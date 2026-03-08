import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

export function NewMainLayout() {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background">
            <TitleBar />
            <div className="flex flex-1 w-full overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
