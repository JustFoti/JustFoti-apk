/**
 * Admin Login Page
 */

import { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin Login - Flyx',
  description: 'Sign in to the Flyx admin dashboard',
};

export default function LoginPage() {
  return <LoginForm />;
}
