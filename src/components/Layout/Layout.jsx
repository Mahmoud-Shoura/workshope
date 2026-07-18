import React from 'react';
import { LayoutDashboard, Calculator, Menu, History, Moon, Sun, LogOut, Settings } from 'lucide-react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { useGlassStore } from '../../hooks/useGlassStore';
import './Layout.css';

// Declare NavItem as a static helper component outside of Layout to comply with react-hooks/static-components
function NavItem({ view, icon: Icon, label, currentView, onViewChange, setSidebarOpen }) {
    return (
        <button
            onClick={() => {
                onViewChange(view);
                setSidebarOpen(false);
            }}
            className={`layout-nav-item ${currentView === view ? 'active' : ''}`}
        >
            <Icon size={20} />
            {label}
        </button>
    );
}

export function Layout({ children, currentView, onViewChange }) {
    const [isSidebarOpen, setSidebarOpen] = React.useState(false);
    const { theme, toggleTheme } = useTheme();
    const { printSettings } = useGlassStore();
    const [exitConfirmCount, setExitConfirmCount] = React.useState(0);
    const [showExitToast, setShowExitToast] = React.useState(false);

    React.useEffect(() => {
        if (exitConfirmCount > 0) {
            const timer = setTimeout(() => {
                setExitConfirmCount(0);
                setShowExitToast(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [exitConfirmCount]);

    const handleExit = () => {
        if (exitConfirmCount === 0) {
            setExitConfirmCount(1);
            setShowExitToast(true);
        } else {
            setShowExitToast(false);
            window.close();
            setTimeout(() => {
                window.location.href = 'about:blank';
            }, 100);
        }
    };

    return (
        <div className="layout-container">
            {/* Mobile Overlay */}
            <div
                className={`layout-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`layout-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="layout-sidebar-header">
                    {printSettings?.workshop_name || 'نظام إدارة الورش'}
                </div>
                <div className="layout-sidebar-nav">
                    <NavItem 
                        view="calculator" 
                        icon={Calculator} 
                        label="الحاسبة" 
                        currentView={currentView} 
                        onViewChange={onViewChange} 
                        setSidebarOpen={setSidebarOpen} 
                    />
                    <NavItem 
                        view="inventory" 
                        icon={LayoutDashboard} 
                        label="المخزن" 
                        currentView={currentView} 
                        onViewChange={onViewChange} 
                        setSidebarOpen={setSidebarOpen} 
                    />
                    <NavItem 
                        view="history" 
                        icon={History} 
                        label="السجل" 
                        currentView={currentView} 
                        onViewChange={onViewChange} 
                        setSidebarOpen={setSidebarOpen} 
                    />
                    <NavItem 
                        view="settings" 
                        icon={Settings} 
                        label="الإعدادات" 
                        currentView={currentView} 
                        onViewChange={onViewChange} 
                        setSidebarOpen={setSidebarOpen} 
                    />
                    <button
                        onClick={handleExit}
                        className={`layout-nav-item exit-btn ${exitConfirmCount > 0 ? 'confirming' : ''}`}
                    >
                        <LogOut size={20} />
                        خروج
                    </button>
                </div>

                <div className="layout-sidebar-footer">
                    <button
                        onClick={toggleTheme}
                        className="layout-nav-item"
                    >
                        {theme === 'light' ? (
                            <>
                                <Moon size={20} />
                                الوضع الليلي
                            </>
                        ) : (
                            <>
                                <Sun size={20} />
                                الوضع النهاري
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="layout-main">
                <header className="layout-mobile-header">
                    <button onClick={() => setSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <span>
                        {currentView === 'calculator' && 'الحاسبة'}
                        {currentView === 'inventory' && 'المخزن'}
                        {currentView === 'history' && 'السجل'}
                        {currentView === 'settings' && 'الإعدادات'}
                    </span>
                </header>

                <div className="layout-content">
                    {children}
                </div>
            </main>

            {/* Exit confirmation toast */}
            {showExitToast && (
                <div className="layout-exit-toast">
                    اضغط مرة أخرى للخروج من الموقع
                </div>
            )}
        </div>
    );
}
