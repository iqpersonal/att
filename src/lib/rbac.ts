export type Role = 'super-admin' | 'admin' | 'teacher' | 'receptionist' | 'staff';

export interface Permission {
  action: 'view' | 'manage';
  subject: 'students' | 'leads' | 'attendance' | 'batches' | 'messaging' | 'settings' | 'admin';
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  'super-admin': ['all'],
  'admin': [
    'view:students', 'manage:students',
    'view:leads', 'manage:leads',
    'view:attendance', 'manage:attendance',
    'view:batches', 'manage:batches',
    'view:messaging', 'manage:messaging',
    'view:settings', 'manage:settings'
  ],
  'teacher': [
    'view:students',
    'view:attendance', 'manage:attendance',
    'view:batches',
    'view:messaging'
  ],
  'receptionist': [
    'view:students',
    'view:leads', 'manage:leads',
    'view:messaging', 'manage:messaging'
  ],
  'staff': [
    'view:students',
    'view:attendance', 'manage:attendance'
  ]
};

export function canAccess(userRole: Role | string | null, permission: string): boolean {
  if (!userRole) return false;
  if (userRole === 'super-admin') return true;
  
  const permissions = ROLE_PERMISSIONS[userRole as Role] || [];
  return permissions.includes(permission) || permissions.includes('all');
}

export const MENU_PERMISSIONS: Record<string, string> = {
  '/dashboard/students': 'view:students',
  '/dashboard/leads': 'view:leads',
  '/dashboard/leads/integrations': 'manage:leads',
  '/dashboard/batches': 'view:batches',
  '/dashboard/attendance': 'view:attendance',
  '/dashboard/messaging': 'view:messaging',
  '/dashboard/messaging/chats': 'view:messaging',
  '/dashboard/settings': 'view:settings',
  '/dashboard/admin': 'all',
  '/dashboard/admin/schools': 'all',
  '/dashboard/admin/announcements': 'all',
  '/dashboard/admin/settings': 'all',
};