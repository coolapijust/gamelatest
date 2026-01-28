import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Github, ExternalLink, Star, GitFork } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function DownloadSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }

    const particles: Particle[] = [];
    const particleCount = 80;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 200 + 100;
      particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        // Move towards center
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
          particle.vx += (dx / dist) * 0.02;
          particle.vy += (dy / dist) * 0.02;
        }

        // Apply velocity
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Damping
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 122, 255, ${particle.alpha})`;
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach((other) => {
          const connDx = particle.x - other.x;
          const connDy = particle.y - other.y;
          const connDist = Math.sqrt(connDx * connDx + connDy * connDy);

          if (connDist < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 122, 255, ${0.1 * (1 - connDist / 100)})`;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title glitch reveal animation
      gsap.fromTo(titleRef.current,
        { opacity: 0, skewX: 20 },
        {
          opacity: 1,
          skewX: 0,
          duration: 0.5,
          ease: 'steps(5)',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Content animation
      gsap.fromTo(contentRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="download"
      ref={sectionRef}
      className="relative w-full py-32 overflow-hidden"
    >
      {/* Particle canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, #161616 70%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Title */}
        <div ref={titleRef} className="mb-8 opacity-0">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            立即<span className="text-[#007aff]">开始</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            下载 Game Latest，体验高效的 Steam 游戏入库管理
          </p>
        </div>

        {/* Download buttons */}
        <div ref={contentRef} className="opacity-0">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg"
              className="magnetic-btn bg-[#007aff] hover:bg-[#0066cc] text-white px-10 py-7 text-lg rounded-xl animate-pulse-glow"
              onClick={() => window.open('https://github.com/coolapijust/gamelatest/releases/', '_blank')}
            >
              <Download className="mr-2 h-5 w-5" />
              下载 Game Latest
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="magnetic-btn border-gray-600 text-white hover:bg-white/10 px-10 py-7 text-lg rounded-xl"
              onClick={() => window.open('https://github.com/coolapijust/gamelatest', '_blank')}
            >
              <Github className="mr-2 h-5 w-5" />
              查看源码
            </Button>
          </div>

          {/* Version info */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400 mb-12">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#007aff] mr-2" />
              当前版本: 1.0.2
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#34c759] mr-2" />
              许可证: MPL
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#ff9500] mr-2" />
              支持: Windows 10/11
            </div>
          </div>

          {/* GitHub stats */}
          <div className="flex justify-center gap-8">
            <a 
              href="https://github.com/coolapijust/gamelatest"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Star className="w-5 h-5" />
              <span>Star</span>
            </a>
            <a 
              href="https://github.com/coolapijust/gamelatest"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <GitFork className="w-5 h-5" />
              <span>Fork</span>
            </a>
            <a 
              href="https://github.com/coolapijust/gamelatest/releases/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Releases</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
