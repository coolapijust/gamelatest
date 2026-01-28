import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title character animation
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.char');
        gsap.fromTo(chars, 
          { y: '100%', opacity: 0 },
          { 
            y: '0%', 
            opacity: 1, 
            duration: 0.8, 
            stagger: 0.05,
            ease: 'expo.out',
            delay: 0.2
          }
        );
      }

      // Subtitle animation
      gsap.fromTo(subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', delay: 0.6 }
      );

      // Description animation
      gsap.fromTo(descRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', delay: 0.7 }
      );

      // Button animation
      gsap.fromTo(btnRef.current,
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.8 }
      );

      // Image 3D reveal
      gsap.fromTo(imageRef.current,
        { rotateX: 45, opacity: 0, scale: 0.8, y: 100 },
        { 
          rotateX: 15, 
          opacity: 1, 
          scale: 1, 
          y: 0,
          duration: 1.2, 
          ease: 'power3.out',
          delay: 0.3
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Mouse tracking for 3D tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setMousePos({ x: x * 15, y: y * -15 });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const titleChars = 'Game Latest'.split('').map((char, i) => (
    <span key={i} className="char inline-block" style={{ animationDelay: `${i * 0.05}s` }}>
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* Gradient mesh background */}
      <div className="absolute inset-0 gradient-mesh" />
      
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(0,122,255,0.3) 0%, transparent 70%)',
            top: '10%',
            left: '-10%',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(94,92,230,0.3) 0%, transparent 70%)',
            bottom: '20%',
            right: '-5%',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div className="text-center lg:text-left">
            <h1 
              ref={titleRef}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 overflow-hidden"
            >
              {titleChars}
            </h1>
            
            <p 
              ref={subtitleRef}
              className="text-xl sm:text-2xl text-[#007aff] font-medium mb-4 opacity-0"
            >
              Steam 游戏入库工具
            </p>
            
            <p 
              ref={descRef}
              className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 opacity-0"
            >
              专为 Steam 用户设计的桌面应用程序，提供便捷的游戏入库管理功能。
              支持批量下载、自动处理 DLC、创意工坊修复，让游戏管理更高效。
            </p>

            <div ref={btnRef} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start opacity-0">
              <Button 
                size="lg"
                className="magnetic-btn bg-[#007aff] hover:bg-[#0066cc] text-white px-8 py-6 text-lg rounded-xl animate-pulse-glow"
                onClick={() => window.open('https://github.com/coolapijust/gamelatest/releases/', '_blank')}
              >
                <Download className="mr-2 h-5 w-5" />
                立即下载
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="magnetic-btn border-gray-600 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                了解更多
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Right: App interface with 3D tilt */}
          <div 
            ref={imageRef}
            className="relative tilt-element opacity-0"
            style={{
              transform: `rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="relative animate-float">
              {/* Glow effect behind image */}
              <div 
                className="absolute inset-0 blur-3xl opacity-40"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,122,255,0.5) 0%, rgba(94,92,230,0.3) 100%)',
                  transform: 'translateZ(-50px) scale(1.1)',
                }}
              />
              
              {/* Main app image */}
              <img 
                src="/hero-app.jpg" 
                alt="Game Latest App Interface"
                className="relative rounded-2xl shadow-2xl w-full"
                style={{
                  boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 30px 60px -30px rgba(0,122,255,0.3)',
                }}
              />

              {/* Floating detail card */}
              <div 
                className="absolute -bottom-8 -left-8 w-48 animate-float-slow"
                style={{
                  transform: 'translateZ(80px)',
                  animationDelay: '1s',
                }}
              >
                <img 
                  src="/detail-card.png" 
                  alt="Game Detail Card"
                  className="w-full rounded-xl shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #161616 0%, transparent 100%)',
        }}
      />
    </section>
  );
}
