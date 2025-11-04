'use client';

import React from 'react';
import { Navigation, Footer, PageTransition } from './index';

/**
 * Example: Basic Layout with Navigation and Footer
 */
export const BasicLayoutExample: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Navigation />
      <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
        {children}
      </main>
      <Footer />
    </>
  );
};

/**
 * Example: Layout with Transparent Navigation
 */
export const TransparentNavExample: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Navigation transparent={true} />
      <main style={{ minHeight: '100vh' }}>
        {children}
      </main>
      <Footer />
    </>
  );
};

/**
 * Example: Layout with Search Handler
 */
export const SearchLayoutExample: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Implement search logic here
  };

  return (
    <>
      <Navigation onSearch={handleSearch} />
      <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
        {children}
      </main>
      <Footer />
    </>
  );
};

/**
 * Example: Layout with Page Transitions
 */
export const TransitionLayoutExample: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Navigation />
      <PageTransition>
        <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
          {children}
        </main>
      </PageTransition>
      <Footer />
    </>
  );
};

/**
 * Example: Complete Layout (Recommended)
 */
export const CompleteLayoutExample: React.FC<{ 
  children: React.ReactNode;
  transparent?: boolean;
}> = ({ children, transparent = false }) => {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Implement search logic
  };

  return (
    <>
      <Navigation transparent={transparent} onSearch={handleSearch} />
      <PageTransition>
        <main style={{ 
          minHeight: '100vh', 
          paddingTop: transparent ? '0' : '80px',
          paddingBottom: '2rem'
        }}>
          {children}
        </main>
      </PageTransition>
      <Footer />
    </>
  );
};

/**
 * Demo Page Component
 */
export const LayoutDemo: React.FC = () => {
  return (
    <CompleteLayoutExample>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem' 
      }}>
        <h1>Layout System Demo</h1>
        <p>This page demonstrates the navigation and layout system.</p>
        
        <section style={{ marginTop: '3rem' }}>
          <h2>Features</h2>
          <ul>
            <li>Glassmorphism navigation with scroll effects</li>
            <li>Mobile-responsive with bottom navigation</li>
            <li>Magnetic hover effects on nav items</li>
            <li>Integrated search functionality</li>
            <li>Smooth page transitions</li>
            <li>Futuristic footer with animated backgrounds</li>
          </ul>
        </section>

        <section style={{ marginTop: '3rem' }}>
          <h2>Scroll Down</h2>
          <p>Scroll down to see the navigation background change.</p>
        </section>

        <div style={{ height: '100vh' }} />

        <section>
          <h2>You Scrolled!</h2>
          <p>Notice how the navigation now has a glassmorphism background.</p>
        </section>
      </div>
    </CompleteLayoutExample>
  );
};

export default LayoutDemo;
