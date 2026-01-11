import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  shape: 'circle' | 'plus' | 'ring';
}

interface FloatingParticlesProps {
  avatarId?: string;
  className?: string;
}

const generateParticles = (count: number): Particle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 10,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    shape: (['circle', 'plus', 'ring'] as const)[Math.floor(Math.random() * 3)],
  }));
};

export const FloatingParticles = ({ avatarId = 'verifier', className }: FloatingParticlesProps) => {
  const [particles] = useState(() => generateParticles(12));

  const getParticleColor = () => {
    switch (avatarId) {
      case 'advisor':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'companion':
        return 'bg-violet-500/10 border-violet-500/20';
      default:
        return 'bg-sky-500/10 border-sky-500/20';
    }
  };

  const renderShape = (particle: Particle) => {
    const colorClass = getParticleColor();
    
    switch (particle.shape) {
      case 'plus':
        return (
          <div className="relative" style={{ width: particle.size, height: particle.size }}>
            <div className={cn("absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 rounded-full", colorClass.replace('border-', 'bg-').split(' ')[0])} />
            <div className={cn("absolute left-1/2 top-0 w-[2px] h-full -translate-x-1/2 rounded-full", colorClass.replace('border-', 'bg-').split(' ')[0])} />
          </div>
        );
      case 'ring':
        return (
          <div 
            className={cn("rounded-full border-2", colorClass)}
            style={{ width: particle.size, height: particle.size }}
          />
        );
      default:
        return (
          <div 
            className={cn("rounded-full", colorClass)}
            style={{ width: particle.size, height: particle.size }}
          />
        );
    }
  };

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {renderShape(particle)}
        </div>
      ))}
    </div>
  );
};
