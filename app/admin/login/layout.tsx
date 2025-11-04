/**
 * Login Page Layout (No Auth Required)
 */

import { ReactNode } from 'react';

interface LoginLayoutProps {
  children: ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  // This layout bypasses the admin authentication guard
  return <>{children}</>;
}
