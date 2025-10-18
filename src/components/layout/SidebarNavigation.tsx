import React from 'react';
import { LucideIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface SidebarNavigationProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (itemId: string) => void;
  userType: 'student' | 'faculty' | 'parent' | 'alumni' | 'admin';
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SidebarNavigation = ({
  items,
  activeItem,
  onItemClick,
  userType,
  collapsed = false,
  mobileOpen = false,
  onMobileClose
}: SidebarNavigationProps) => {
  const getRoleStyles = (userType: string, isActive: boolean) => {
    if (!isActive) return '';
    
    switch (userType) {
      case 'student':
        return 'bg-role-student/20 text-role-student border border-role-student/30';
      case 'faculty':
        return 'bg-role-teacher/20 text-role-teacher border border-role-teacher/30';
      case 'parent':
        return 'bg-role-parent/20 text-role-parent border border-role-parent/30';
      case 'alumni':
        return 'bg-role-alumni/20 text-role-alumni border border-role-alumni/30';
      case 'admin':
        return 'bg-role-admin/20 text-role-admin border border-role-admin/30';
      default:
        return 'bg-primary/20 text-primary border border-primary/30';
    }
  };

  const getRoleIconColor = (userType: string, isActive: boolean) => {
    if (!isActive) return '';
    
    switch (userType) {
      case 'student': return 'text-role-student';
      case 'faculty': return 'text-role-teacher';
      case 'parent': return 'text-role-parent';
      case 'alumni': return 'text-role-alumni';
      case 'admin': return 'text-role-admin';
      default: return 'text-primary';
    }
  };

  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ease-in-out"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "bg-card border-r border-white/10 fixed inset-y-0 left-0 z-50 w-64 md:relative md:h-auto h-full",
          "bg-black flex md:flex-col overflow-hidden",
          "translate-x-0 opacity-100 -translate-x-full md:translate-x-0 opacity-0 md:opacity-100",
          "transition-all duration-300 ease-in-out",
          collapsed ? "md:w-16" : "md:w-64", 
          mobileOpen
            ? "translate-x-0 opacity-100 mt-[60px]"
            : "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100"
        )}
      >
        {/* Mobile Close Button */}
        {/* <div className="md:hidden flex justify-start p-4 border-b border-white/10">
          <button
            onClick={onMobileClose}
            className="text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div> */}
        {/* Navigation Items */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-left",
                  isActive
                    ? getRoleStyles(userType, true)
                    : "text-muted-foreground hover:bg-white/5 hover:text-card-foreground",
                  collapsed && "md:justify-center"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  getRoleIconColor(userType, isActive)
                )} />
                <span className={cn(
                  "font-medium text-sm",
                  collapsed && "md:hidden"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SidebarNavigation;