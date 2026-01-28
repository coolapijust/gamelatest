import { useEffect, useRef } from 'react';
import { Github, Heart, ExternalLink } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const navLinks = [
  { name: '首页', href: '#' },
  { name: '功能', href: '#features' },
  { name: '模块', href: '#showcase' },
  { name: '下载', href: '#download' },
];

const socialLinks = [
  { name: 'GitHub', icon: Github, href: 'https://github.com/coolapijust/gamelatest' },
];

export default function Footer() {
  const footerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Line draw animation
      gsap.fromTo(lineRef.current,
        { width: '0%' },
        {
          width: '100%',
          duration: 1,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Content stagger animation
      const columns = contentRef.current?.querySelectorAll('.footer-column');
      if (columns) {
        gsap.fromTo(columns,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer 
      ref={footerRef}
      className="relative w-full py-16 overflow-hidden"
    >
      {/* Top line */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div 
          ref={lineRef}
          className="h-px bg-gradient-to-r from-transparent via-[#007aff]/50 to-transparent"
          style={{ width: '0%' }}
        />
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="footer-column opacity-0">
            <h3 className="text-2xl font-bold text-white mb-4">
              Game <span className="text-[#007aff]">Latest</span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              专为 Steam 用户设计的桌面应用程序，提供便捷的游戏入库管理功能。
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 mx-1 fill-current" />
              <span>for gamers</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="footer-column opacity-0">
            <h4 className="text-white font-semibold mb-4">快速链接</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="link-hover text-gray-400 hover:text-white transition-colors text-sm inline-block"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Links */}
          <div className="footer-column opacity-0">
            <h4 className="text-white font-semibold mb-4">关注我们</h4>
            <div className="flex gap-4 mb-6">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-[#252525] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#007aff]/20 transition-all"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
            
            {/* Acknowledgment */}
            <div className="text-sm">
              <p className="text-gray-500 mb-2">致谢</p>
              <a 
                href="https://github.com/pvzcxw/unlockgamesmanager"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#007aff] transition-colors flex items-center gap-1"
              >
                pvzcsx/unlockgamesmanager
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-[#2c2c2c] text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Game Latest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
