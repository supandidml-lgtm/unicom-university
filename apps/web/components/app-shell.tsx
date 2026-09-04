'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

type User = {
  email: string;
  permissions: string[];
  roles: { code: string; name: string }[];
};

type NavigationItem = { href: string; label: string; permission?: string };

const administration: NavigationItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', permission: 'reports.read' },
  { href: '/admin/participants', label: 'Participants', permission: 'participants.read' },
  { href: '/admin/trainers', label: 'Trainers', permission: 'trainers.read' },
  { href: '/admin/brands', label: 'Brands', permission: 'brands.read' },
  { href: '/admin/curricula', label: 'Curricula', permission: 'curricula.read' },
  { href: '/admin/reports/participants', label: 'Reports', permission: 'reports.read' },
  { href: '/admin/access', label: 'Access & RBAC', permission: 'roles.read' },
];

const trainer: NavigationItem[] = [
  { href: '/trainer/dashboard', label: 'Dashboard', permission: 'reports.read' },
  { href: '/trainer/participants', label: 'Participants', permission: 'participants.read' },
  { href: '/trainer/curricula', label: 'Curricula', permission: 'curricula.read' },
  { href: '/trainer/reports/participants', label: 'Reports', permission: 'reports.read' },
];

const participant: NavigationItem[] = [
  { href: '/my-training', label: 'My Training', permission: 'enrollments.read_self' },
  {
    href: '/my-training/certificates',
    label: 'Certificates',
    permission: 'certificates.read_self',
  },
];

const publicRoutes = new Set(['/login', '/activate', '/forgot-password', '/reset-password']);

const pageTitles: Array<[string, string]> = [
  ['/admin/dashboard', 'Dashboard'],
  ['/trainer/dashboard', 'Trainer Dashboard'],
  ['/my-training/certificates', 'Certificates'],
  ['/my-training', 'My Training'],
  ['/admin/reports', 'Reports'],
  ['/trainer/reports', 'Reports'],
  ['/admin/curricula', 'Curricula'],
  ['/trainer/curricula', 'Curricula'],
  ['/admin/participants', 'Participants'],
  ['/trainer/participants', 'Participants'],
  ['/admin/trainers', 'Trainers'],
  ['/admin/brands', 'Brands'],
  ['/admin/access', 'Access & RBAC'],
  ['/login', 'Sign in'],
  ['/activate', 'Activate account'],
  ['/forgot-password', 'Reset password'],
  ['/reset-password', 'New password'],
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/my-training' && pathname.startsWith(`${href}/`));
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isPublic = publicRoutes.has(pathname);

  useEffect(() => {
    const matchingTitle =
      pageTitles.find(([path]) => pathname.startsWith(path))?.[1] ?? 'UNICOM University';
    document.title =
      matchingTitle === 'UNICOM University'
        ? matchingTitle
        : `${matchingTitle} | UNICOM University`;
  }, [pathname]);

  useEffect(() => {
    if (isPublic) return;
    let mounted = true;
    async function loadUser() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
        if (response.status === 401) {
          window.location.replace('/login?session=expired');
          return;
        }
        if (!response.ok || !mounted) return;
        const payload = (await response.json()) as { user: User };
        if (mounted) setUser(payload.user);
      } catch {
        // Keep the current page visible; its own retryable request state explains service failures.
      }
    }
    void loadUser();
    return () => {
      mounted = false;
    };
  }, [isPublic, pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    const first = drawer?.querySelector<HTMLElement>('a, button');
    first?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
      if (event.key !== 'Tab' || !drawer) return;
      const controls = drawer.querySelectorAll<HTMLElement>('a, button:not([disabled])');
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (!firstControl || !lastControl) return;
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  if (isPublic) return <>{children}</>;

  const roleCodes = new Set(user?.roles.map((role) => role.code) ?? []);
  const isSuperAdmin = roleCodes.has('SUPER_ADMIN');
  const visibleItems = [
    ...(isSuperAdmin ? administration : []),
    ...(roleCodes.has('TRAINER') ? trainer : []),
    ...(roleCodes.has('TRAINEE') ? participant : []),
  ].filter((item) => !item.permission || user?.permissions.includes(item.permission));

  async function logout() {
    try {
      const csrf = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
      if (!csrf.ok) throw new Error('csrf');
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken },
      });
      if (response.ok) window.location.assign('/login');
    } catch {
      window.location.assign('/login?session=expired');
    }
  }

  const navigation = (
    <nav aria-label="Primary navigation" className="space-y-1">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          onClick={() => setDrawerOpen(false)}
          className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${isActive(pathname, item.href) ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-800 md:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
            <Link
              href="/authenticated"
              className="text-sm font-black tracking-[0.12em] text-indigo-900"
            >
              UNICOM UNIVERSITY
            </Link>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p
                  className="max-w-56 truncate text-sm font-semibold text-slate-900"
                  title={user.email}
                >
                  {user.email}
                </p>
                <p className="text-xs text-slate-600">
                  {user.roles.map((role) => role.code).join(', ')}
                </p>
              </div>
              <button
                type="button"
                className="min-h-11 rounded-lg px-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                onClick={() => void logout()}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <div className="mx-auto flex max-w-screen-2xl">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
          {navigation}
        </aside>
        <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </div>
      </div>
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
          onMouseDown={() => setDrawerOpen(false)}
        >
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="h-full w-80 max-w-[85vw] bg-white p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="font-black tracking-[0.12em] text-indigo-900">UNICOM UNIVERSITY</p>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
