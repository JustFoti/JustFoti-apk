'use client';

import React, { useState } from 'react';
import {
  Card3D,
  GlassPanel,
  FluidButton,
  ParallaxContainer,
  ParallaxLayer,
  AnimatedGrid,
  AnimatedGridItem,
} from './index';

/**
 * Example showcase for all UI primitive components
 * This file demonstrates how to use each component
 */

export const Card3DExample = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Card3D Examples</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card3D
          intensity={15}
          glowColor="rgba(0, 245, 255, 0.4)"
          onClick={() => console.log('Card 1 clicked')}
          ariaLabel="Example card 1"
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">Cyan Glow</h3>
            <p className="text-gray-400">Hover to see 3D tilt effect</p>
          </div>
        </Card3D>

        <Card3D
          intensity={20}
          glowColor="rgba(139, 92, 246, 0.4)"
          onClick={() => console.log('Card 2 clicked')}
          ariaLabel="Example card 2"
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">Purple Glow</h3>
            <p className="text-gray-400">Higher intensity tilt</p>
          </div>
        </Card3D>

        <Card3D
          intensity={10}
          glowColor="rgba(244, 113, 181, 0.4)"
          disabled={true}
          ariaLabel="Example card 3 (disabled)"
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">Disabled State</h3>
            <p className="text-gray-400">No interaction</p>
          </div>
        </Card3D>
      </div>
    </div>
  );
};

export const GlassPanelExample = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">GlassPanel Examples</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassPanel
          blur="xl"
          opacity={0.05}
          borderGlow={true}
          gradient={true}
          rounded="2xl"
          shadow="lg"
        >
          <h3 className="text-xl font-semibold mb-2">With Border Glow</h3>
          <p className="text-gray-400">
            Glassmorphism panel with gradient border and ambient lighting
          </p>
        </GlassPanel>

        <GlassPanel
          blur="md"
          opacity={0.1}
          borderGlow={false}
          gradient={false}
          rounded="xl"
          shadow="md"
        >
          <h3 className="text-xl font-semibold mb-2">Simple Glass</h3>
          <p className="text-gray-400">
            Clean glassmorphism without extra effects
          </p>
        </GlassPanel>
      </div>
    </div>
  );
};

export const FluidButtonExample = () => {
  const [loading, setLoading] = useState(false);

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">FluidButton Examples</h2>
      <div className="flex flex-wrap gap-4">
        <FluidButton
          variant="primary"
          size="md"
          onClick={() => console.log('Primary clicked')}
          ariaLabel="Primary button"
        >
          Primary Button
        </FluidButton>

        <FluidButton
          variant="secondary"
          size="md"
          onClick={() => console.log('Secondary clicked')}
          ariaLabel="Secondary button"
        >
          Secondary Button
        </FluidButton>

        <FluidButton
          variant="accent"
          size="md"
          onClick={() => console.log('Accent clicked')}
          ariaLabel="Accent button"
        >
          Accent Button
        </FluidButton>

        <FluidButton
          variant="ghost"
          size="md"
          onClick={() => console.log('Ghost clicked')}
          ariaLabel="Ghost button"
        >
          Ghost Button
        </FluidButton>

        <FluidButton
          variant="primary"
          size="sm"
          onClick={() => console.log('Small clicked')}
          ariaLabel="Small button"
        >
          Small
        </FluidButton>

        <FluidButton
          variant="primary"
          size="lg"
          onClick={() => console.log('Large clicked')}
          ariaLabel="Large button"
        >
          Large Button
        </FluidButton>

        <FluidButton
          variant="primary"
          size="md"
          loading={loading}
          onClick={handleLoadingClick}
          ariaLabel="Loading button"
        >
          {loading ? 'Loading...' : 'Click for Loading'}
        </FluidButton>

        <FluidButton
          variant="primary"
          size="md"
          disabled={true}
          ariaLabel="Disabled button"
        >
          Disabled
        </FluidButton>
      </div>
    </div>
  );
};

export const ParallaxExample = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Parallax Examples</h2>
      <ParallaxContainer
        height="h-96"
        enableMouseParallax={true}
        mouseStrength={20}
        ariaLabel="Parallax demonstration"
      >
        <ParallaxLayer speed={0.5} zIndex={0} className="absolute inset-0">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-20">Background</div>
          </div>
        </ParallaxLayer>

        <ParallaxLayer speed={1} zIndex={1} className="absolute inset-0">
          <div className="w-full h-full flex items-center justify-center">
            <GlassPanel blur="xl" borderGlow={true}>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">Middle Layer</h3>
                <p className="text-gray-400">Move your mouse to see parallax</p>
              </div>
            </GlassPanel>
          </div>
        </ParallaxLayer>

        <ParallaxLayer speed={1.5} zIndex={2} className="absolute inset-0">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl font-bold">Foreground</div>
          </div>
        </ParallaxLayer>
      </ParallaxContainer>
    </div>
  );
};

export const AnimatedGridExample = () => {
  const [items, setItems] = useState([
    { id: '1', title: 'Item 1', color: 'bg-neon-cyan' },
    { id: '2', title: 'Item 2', color: 'bg-neon-purple' },
    { id: '3', title: 'Item 3', color: 'bg-neon-pink' },
    { id: '4', title: 'Item 4', color: 'bg-neon-orange' },
    { id: '5', title: 'Item 5', color: 'bg-neon-green' },
    { id: '6', title: 'Item 6', color: 'bg-neon-cyan' },
  ]);

  const shuffleItems = () => {
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const removeItem = () => {
    setItems((prev) => prev.slice(0, -1));
  };

  const addItem = () => {
    const colors = ['bg-neon-cyan', 'bg-neon-purple', 'bg-neon-pink', 'bg-neon-orange', 'bg-neon-green'];
    const newItem = {
      id: String(Date.now()),
      title: `Item ${items.length + 1}`,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setItems((prev) => [...prev, newItem]);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">AnimatedGrid Examples</h2>
      
      <div className="flex gap-4 mb-6">
        <FluidButton variant="primary" size="sm" onClick={shuffleItems}>
          Shuffle
        </FluidButton>
        <FluidButton variant="secondary" size="sm" onClick={addItem}>
          Add Item
        </FluidButton>
        <FluidButton variant="accent" size="sm" onClick={removeItem} disabled={items.length === 0}>
          Remove Item
        </FluidButton>
      </div>

      <AnimatedGrid
        columns={{ sm: 1, md: 2, lg: 3 }}
        gap="gap-6"
        staggerDelay={0.05}
        animateOnMount={true}
        ariaLabel="Animated grid demonstration"
      >
        {items.map((item) => (
          <AnimatedGridItem key={item.id} layoutId={item.id}>
            <GlassPanel blur="lg" borderGlow={true}>
              <div className="p-6">
                <div className={`w-12 h-12 rounded-lg ${item.color} mb-4 opacity-50`} />
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-gray-400 text-sm">Click shuffle to see animations</p>
              </div>
            </GlassPanel>
          </AnimatedGridItem>
        ))}
      </AnimatedGrid>
    </div>
  );
};

/**
 * Complete showcase component
 */
export const UIComponentsShowcase = () => {
  return (
    <div className="min-h-screen bg-primary-bg">
      <div className="max-w-7xl mx-auto py-12">
        <h1 className="text-5xl font-bold text-center mb-12 bg-gradient-primary bg-clip-text text-transparent">
          Futuristic UI Components
        </h1>

        <div className="space-y-12">
          <Card3DExample />
          <GlassPanelExample />
          <FluidButtonExample />
          <ParallaxExample />
          <AnimatedGridExample />
        </div>
      </div>
    </div>
  );
};

export default UIComponentsShowcase;
