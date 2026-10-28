'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from '@phosphor-icons/react';

const LINKS = [
  { href: '/admin', label: 'Today' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/availability', label: 'Hours & time off' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/integrations', label: 'Email & calendar' },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <>
      {LINKS.map((link) => {
        const active = link.href === '/admin' ? path === '/admin' : path.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined}>
            {link.label}
          </Link>
        );
      })}
      <Link href="/" target="_blank">
        View booking page <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </>
  );
}
