import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Menu, X } from 'lucide-react';

const navLinks = [
  { name: '首页', href: '#' },
  { name: '功能', href: '#features' },
  { name: '模块', href: '#showcase' },
  { name: '下载', href: '#download' },
];

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#161616]/80 backdrop-blur-xl border-b border-[#2c2c2c]/50' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a 
              href="#"
              onClick={(e) => handleNavClick(e, '#')}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-[#007aff] flex items-center justify-center">
                <span className="text-white font-bold text-sm">GL</span>
              </div>
              <span className="text-white font-semibold hidden sm:block">
                Game Latest
              </span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button 
                size="sm"
                className="bg-[#007aff] hover:bg-[#0066cc] text-white rounded-lg"
                onClick={() => window.open('https://github.com/coolapijust/gamelatest/releases/', '_blank')}
              >
                <Download className="w-4 h-4 mr-1" />
                下载
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div 
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          isMobileMenuOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Menu panel */}
        <div 
          className={`absolute top-16 left-4 right-4 bg-[#1a1a1a] border border-[#2c2c2c] rounded-2xl p-6 transition-all duration-300 ${
            isMobileMenuOpen 
              ? 'translate-y-0 opacity-100' 
              : '-translate-y-4 opacity-0'
          }`}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-gray-300 hover:text-white transition-colors text-lg font-medium py-2"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 border-t border-[#2c2c2c]">
              <Button 
                className="w-full bg-[#007aff] hover:bg-[#0066cc] text-white rounded-lg"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.open('https://github.com/coolapijust/gamelatest/releases/', '_blank');
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                下载 Game Latest
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
