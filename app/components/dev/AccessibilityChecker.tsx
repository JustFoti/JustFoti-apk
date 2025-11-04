/**
 * Accessibility Checker Component
 * Development tool to check accessibility issues in real-time
 * Only rendered in development mode
 */

'use client';

import React, { useEffect, useState } from 'react';
import { getContrastRatio, meetsContrastRequirement } from '@/lib/utils/accessibility';

interface AccessibilityIssue {
  type: 'error' | 'warning';
  message: string;
  element?: string;
}

export function AccessibilityChecker() {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    const checkAccessibility = () => {
      const foundIssues: AccessibilityIssue[] = [];

      // Check for images without alt text
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          foundIssues.push({
            type: 'error',
            message: `Image ${index + 1} missing alt text`,
            element: img.src,
          });
        }
      });

      // Check for buttons without accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button, index) => {
        const hasText = button.textContent?.trim();
        const hasAriaLabel = button.getAttribute('aria-label');
        const hasAriaLabelledBy = button.getAttribute('aria-labelledby');

        if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
          foundIssues.push({
            type: 'error',
            message: `Button ${index + 1} has no accessible name`,
            element: button.className,
          });
        }
      });

      // Check for links without accessible names
      const links = document.querySelectorAll('a');
      links.forEach((link, index) => {
        const hasText = link.textContent?.trim();
        const hasAriaLabel = link.getAttribute('aria-label');

        if (!hasText && !hasAriaLabel) {
          foundIssues.push({
            type: 'error',
            message: `Link ${index + 1} has no accessible name`,
            element: link.href,
          });
        }
      });

      // Check for form inputs without labels
      const inputs = document.querySelectorAll('input:not([type="hidden"])');
      inputs.forEach((input, index) => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasAriaLabelledBy = input.getAttribute('aria-labelledby');

        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
          foundIssues.push({
            type: 'error',
            message: `Input ${index + 1} has no associated label`,
            element: input.name || input.id,
          });
        }
      });

      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName[1]);
        if (previousLevel > 0 && level > previousLevel + 1) {
          foundIssues.push({
            type: 'warning',
            message: `Heading level skipped from h${previousLevel} to h${level}`,
            element: heading.textContent?.substring(0, 50),
          });
        }
        previousLevel = level;
      });

      // Check for interactive elements without keyboard access
      const interactiveElements = document.querySelectorAll('[onclick], [onmousedown]');
      interactiveElements.forEach((element, index) => {
        const tagName = element.tagName.toLowerCase();
        const hasTabIndex = element.hasAttribute('tabindex');
        const isButton = tagName === 'button';
        const isLink = tagName === 'a';

        if (!isButton && !isLink && !hasTabIndex) {
          foundIssues.push({
            type: 'warning',
            message: `Interactive element ${index + 1} (${tagName}) may not be keyboard accessible`,
            element: element.className,
          });
        }
      });

      setIssues(foundIssues);
    };

    // Run check after a delay to allow page to render
    const timer = setTimeout(checkAccessibility, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 16px',
          background: issues.length > 0 ? '#ef4444' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
        aria-label={`Accessibility checker: ${issues.length} issues found`}
      >
        A11y: {issues.length}
      </button>

      {/* Issues panel */}
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 9999,
            width: '400px',
            maxHeight: '500px',
            overflow: 'auto',
            background: '#1f2937',
            border: '2px solid #374151',
            borderRadius: '8px',
            padding: '16px',
            color: 'white',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          }}
          role="region"
          aria-label="Accessibility issues"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Accessibility Issues
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '20px',
              }}
              aria-label="Close accessibility checker"
            >
              ×
            </button>
          </div>

          {issues.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>✓</div>
              <div>No accessibility issues found!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {issues.map((issue, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: issue.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    border: `1px solid ${issue.type === 'error' ? '#ef4444' : '#fbbf24'}`,
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>
                      {issue.type === 'error' ? '❌' : '⚠️'}
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {issue.type === 'error' ? 'Error' : 'Warning'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                    {issue.message}
                  </div>
                  {issue.element && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {issue.element}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <strong>Note:</strong> This is a development tool. Run full accessibility audits with
            axe DevTools or Lighthouse for comprehensive testing.
          </div>
        </div>
      )}
    </>
  );
}
