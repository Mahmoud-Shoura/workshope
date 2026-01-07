import React from 'react';
import { LayoutDashboard, Calculator, Settings, Menu, History, Moon, Sun } from 'lucide-react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import './Layout.css';

export function Layout({ children, currentView, onViewChange }) {
    const [isSidebarOpen, setSidebarOpen] = React.useState(false);
    const { theme, toggleTheme } = useTheme();

    const NavItem = ({ view, icon: Icon, label }) => (
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
                    ورشة الزجاج
                </div>
                <div className="layout-sidebar-nav">
                    <NavItem view="calculator" icon={Calculator} label="الحاسبة" />
                    <NavItem view="inventory" icon={LayoutDashboard} label="المخزن" />
                    <NavItem view="history" icon={History} label="السجل" />
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
                    </span>
                </header>

                <div className="layout-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
