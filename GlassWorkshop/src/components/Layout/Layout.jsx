import React from 'react';
import { LayoutDashboard, Calculator, Settings, Menu, History, Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';
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
            className={cn(
                "flex items-center w-full px-4 py-3 text-sm font-medium transition-all rounded-lg",
                currentView === view
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/50"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground hover:shadow-md"
            )}
        >
            <Icon className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0" />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300 lg:static lg:translate-x-0 rtl:right-0 rtl:left-auto rtl:border-l rtl:border-r-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
            )}>
                <div className="h-16 flex items-center px-6 border-b font-bold text-xl">
                    ورشة الزجاج
                </div>
                <div className="p-4 space-y-2">
                    <NavItem view="calculator" icon={Calculator} label="الحاسبة" />
                    <NavItem view="inventory" icon={LayoutDashboard} label="المخزن" />
                    <NavItem view="history" icon={History} label="السجل" />
                    {/* <NavItem view="settings" icon={Settings} label="الإعدادات" /> */}
                </div>

                <div className="mt-auto p-4 border-t">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                    >
                        {theme === 'light' ? (
                            <>
                                <Moon className="w-5 h-5 ml-3" />
                                الوضع الليلي
                            </>
                        ) : (
                            <>
                                <Sun className="w-5 h-5 ml-3" />
                                الوضع النهاري
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen">
                <header className="h-16 border-b flex items-center px-4 lg:hidden sticky top-0 bg-background/95 backdrop-blur z-30">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-semibold rtl:mr-4 rtl:ml-0">
                        {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                    </span>
                </header>

                <div className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
