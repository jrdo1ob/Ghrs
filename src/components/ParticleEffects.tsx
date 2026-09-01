'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  type: 'leaf' | 'star' | 'sparkle';
  rotation: number;
  scale: number;
}

interface ParticleEffectsProps {
  active: boolean;
  onComplete?: () => void;
}

const leafEmojis = ['🍃', '🌿', '🌱', '☘️', '🍀'];
const starEmojis = ['⭐', '✨', '🌟', '💫'];
const sparkleEmojis = ['✨', '💫', '🌟', '⭐'];

export default function ParticleEffects({ active, onComplete }: ParticleEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      type: (['leaf', 'star', 'sparkle'] as const)[Math.floor(Math.random() * 3)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [active, onComplete]);

  const getEmoji = (type: string) => {
    switch (type) {
      case 'leaf': return leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
      case 'star': return starEmojis[Math.floor(Math.random() * starEmojis.length)];
      case 'sparkle': return sparkleEmojis[Math.floor(Math.random() * sparkleEmojis.length)];
      default: return '✨';
    }
  };

  return (
    <div className="ghrs-particles">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="ghrs-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              fontSize: `${particle.scale}rem`,
            }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{
              y: '100vh',
              opacity: 0,
              rotate: particle.rotation,
              x: (Math.random() - 0.5) * 100,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5 + Math.random() * 0.5,
              ease: 'easeOut',
            }}
          >
            {getEmoji(particle.type)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
