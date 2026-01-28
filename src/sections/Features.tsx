import { useEffect, useRef } from 'react';
import { 
  Download, 
  Search, 
  FolderOpen, 
  Settings, 
  Zap, 
  Shield, 
  Layers,
  GitBranch
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Download,
    title: '游戏入库',
    description: '支持从 GitHub 仓库下载游戏清单，ZIP 格式快速入库，批量下载游戏资源文件',
  },
  {
    icon: Search,
    title: '游戏搜索',
    description: '实时搜索 Steam 游戏名称，查看详细信息，快速定位目标游戏',
  },
  {
    icon: FolderOpen,
    title: '文件管理',
    description: '查看已入库文件列表，一键删除不需要的文件，区分不同类型文件',
  },
  {
    icon: Settings,
    title: '系统集成',
    description: '自动检测 Steam 安装路径，识别解锁工具类型，支持自定义配置',
  },
  {
    icon: Zap,
    title: '自动处理',
    description: '自动处理 DLC 内容，支持创意工坊修复，一键自动搜索并入库',
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '支持 GitHub Personal Token 配置，提高 API 限制，保障下载稳定',
  },
  {
    icon: Layers,
    title: '批量操作',
    description: '批量下载游戏资源，可禁用 ZIP 仓库加速搜索，提升操作效率',
  },
  {
    icon: GitBranch,
    title: '仓库管理',
    description: '支持多仓库配置，灵活切换不同来源，满足个性化需求',
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(titleRef.current,
        { x: -50, opacity: 0, filter: 'blur(10px)' },
        {
          x: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards stagger animation
      const cards = cardsRef.current?.querySelectorAll('.feature-card');
      if (cards) {
        gsap.fromTo(cards,
          { y: 50, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'back.out(1.4)',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="features"
      ref={sectionRef}
      className="relative w-full py-24 overflow-hidden"
    >
      {/* Background accent */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,122,255,0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <div ref={titleRef} className="text-center mb-16 opacity-0">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            强大<span className="text-[#007aff]">功能</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Game Latest 提供完整的 Steam 游戏入库解决方案，让游戏管理变得简单高效
          </p>
        </div>

        {/* Features grid */}
        <div 
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ perspective: '1000px' }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="feature-card group relative p-6 rounded-2xl bg-[#1a1a1a] border border-[#2c2c2c] hover:border-[#007aff]/50 transition-all duration-300 card-3d opacity-0"
                style={{
                  transformStyle: 'preserve-3d',
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#007aff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon */}
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#007aff]/10 flex items-center justify-center group-hover:bg-[#007aff]/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-[#007aff]" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="relative text-lg font-semibold text-white mb-2 group-hover:text-[#007aff] transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="relative text-sm text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#007aff]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
