import { useEffect, useRef, useState } from 'react';
import { 
  Home, 
  Download, 
  FolderOpen, 
  Settings, 
  HelpCircle,
  Check,
  ChevronRight
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const modules = [
  {
    icon: Home,
    title: '首页',
    description: '显示 Steam 状态、游戏搜索入口',
    color: '#007aff',
  },
  {
    icon: Download,
    title: '入库',
    description: '游戏搜索、仓库浏览、下载管理',
    color: '#34c759',
  },
  {
    icon: FolderOpen,
    title: '文件',
    description: '已安装文件查看与管理',
    color: '#ff9500',
  },
  {
    icon: Settings,
    title: '设置',
    description: 'Steam 路径、解锁工具、仓库配置',
    color: '#af52de',
  },
  {
    icon: HelpCircle,
    title: '帮助',
    description: '使用指南与常见问题解答',
    color: '#ff3b30',
  },
];

const requirements = [
  'Windows 10/11',
  'Steamtools/Greenluma 客户端',
  '已安装 Steam 客户端',
  'WebView2 运行时',
];

const techStack = [
  { name: 'FastAPI', desc: '后端 API 服务' },
  { name: 'Uvicorn', desc: 'ASGI 服务器' },
  { name: 'Python 3.13', desc: '核心语言' },
  { name: 'HTML/CSS/JS', desc: '前端界面' },
  { name: 'pywebview', desc: '桌面框架' },
  { name: 'PyInstaller', desc: '打包工具' },
];

export default function Showcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(titleRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
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
      id="showcase"
      ref={sectionRef}
      className="relative w-full py-24 overflow-hidden"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <div ref={titleRef} className="text-center mb-16 opacity-0">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            界面<span className="text-[#007aff]">模块</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            精心设计的五大功能模块，提供完整的游戏入库管理体验
          </p>
        </div>

        {/* Main content */}
        <div ref={contentRef} className="opacity-0">
          {/* Modules grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <div
                  key={index}
                  className="group relative p-6 rounded-2xl bg-[#1a1a1a] border border-[#2c2c2c] hover:border-[#007aff]/50 transition-all duration-300 text-center"
                  onMouseEnter={() => setActiveTab(index)}
                >
                  <div 
                    className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center transition-all duration-300"
                    style={{ 
                      backgroundColor: `${module.color}15`,
                    }}
                  >
                    <Icon 
                      className="w-7 h-7 transition-colors duration-300"
                      style={{ color: module.color }}
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{module.title}</h3>
                  <p className="text-xs text-gray-400">{module.description}</p>
                  
                  {/* Active indicator */}
                  <div 
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-300 ${
                      activeTab === index ? 'w-12 opacity-100' : 'w-0 opacity-0'
                    }`}
                    style={{ backgroundColor: module.color }}
                  />
                </div>
              );
            })}
          </div>

          {/* Two column layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* System Requirements */}
            <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-[#2c2c2c]">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-[#007aff]/10 flex items-center justify-center mr-3">
                  <Check className="w-5 h-5 text-[#007aff]" />
                </div>
                系统要求
              </h3>
              <ul className="space-y-4">
                {requirements.map((req, index) => (
                  <li 
                    key={index}
                    className="flex items-center text-gray-300 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#007aff]/20 flex items-center justify-center mr-3 group-hover:bg-[#007aff]/30 transition-colors">
                      <ChevronRight className="w-4 h-4 text-[#007aff]" />
                    </div>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-[#2c2c2c]">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-[#5e5ce6]/10 flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-[#5e5ce6]" />
                </div>
                技术栈
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {techStack.map((tech, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-xl bg-[#252525] border border-[#333] hover:border-[#007aff]/30 transition-colors"
                  >
                    <div className="text-white font-semibold mb-1">{tech.name}</div>
                    <div className="text-xs text-gray-400">{tech.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
