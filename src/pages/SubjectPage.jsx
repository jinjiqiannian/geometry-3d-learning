import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../constants';
import './SubjectPage.css';
function SubjectIcon({ type, size = 24 }) {
  const icons = {
    math: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
        <path d="M3 9l13 7 13-7" />
        <path d="M16 23V9" />
      </svg>
    ),
    physics: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
    chemistry: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <circle cx="12" cy="8" r="3" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 11L12 13" />
        <path d="M12 13L8 13" />
        <path d="M12 13L16 13" />
      </svg>
    ),
    biology: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <ellipse cx="12" cy="12" rx="8" ry="10" />
        <path d="M12 4L12 20" />
        <path d="M6 8L18 8" />
        <path d="M6 12L18 12" />
        <path d="M6 16L18 16" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  };
  return icons[type] || icons.math;
}
const SUBJECT_CONTENT = {
  physics: {
    welcome: '探索物理世界',
    description: '从经典力学到现代物理，用科学思维理解宇宙规律',
    sections: [
      {
        title: '力学基础',
        items: ['牛顿三大定律', '运动学公式', '动量守恒', '能量守恒'],
      },
      {
        title: '电磁学',
        items: ['电场与磁场', '电磁感应', '交流电', '电磁波'],
      },
      {
        title: '光学',
        items: ['光的反射折射', '透镜成像', '光的波动性', '光谱分析'],
      },
    ],
    examples: [
      {
        text: '一个质量为2kg的物体在水平面上受到10N的水平推力，求加速度',
        category: '力学',
      },
      {
        text: '电阻为10Ω的导体两端电压为20V，求通过的电流',
        category: '电磁学',
      },
      { text: '光线从空气射入水中，入射角为30°，求折射角', category: '光学' },
    ],
  },
  chemistry: {
    welcome: '探索化学奥秘',
    description: '从微观原子到宏观物质，理解物质的组成与变化',
    sections: [
      {
        title: '物质结构',
        items: ['原子结构', '化学键', '分子构型', '晶体结构'],
      },
      {
        title: '化学反应',
        items: ['反应类型', '化学平衡', '反应速率', '电化学'],
      },
      {
        title: '有机化学',
        items: ['烃类化合物', '官能团', '有机合成', '生物大分子'],
      },
    ],
    examples: [
      { text: '写出氢气燃烧的化学方程式并配平', category: '化学反应' },
      { text: '计算0.5mol NaCl的质量', category: '物质结构' },
      { text: '乙醇的分子式是什么？它有哪些官能团？', category: '有机化学' },
    ],
  },
  biology: {
    welcome: '探索生命科学',
    description: '从细胞到生态系统，了解生命的奥秘与进化',
    sections: [
      {
        title: '细胞生物学',
        items: ['细胞结构', '细胞膜', '细胞器', '细胞分裂'],
      },
      {
        title: '遗传学',
        items: ['DNA结构', '基因表达', '遗传定律', '基因工程'],
      },
      {
        title: '生态学',
        items: ['生态系统', '食物链', '生物多样性', '环境保护'],
      },
    ],
    examples: [
      {
        text: '细胞膜的主要成分是什么？它有什么功能？',
        category: '细胞生物学',
      },
      {
        text: '豌豆杂交实验中，高茎和矮茎的遗传规律是什么？',
        category: '遗传学',
      },
      { text: '描述食物链中能量流动的特点', category: '生态学' },
    ],
  },
};
export default function SubjectPage({ subjectId }) {
  const navigate = useNavigate();
  const subject = SUBJECTS.find((s) => s.id === subjectId) || SUBJECTS[0];
  const content = SUBJECT_CONTENT[subjectId] || SUBJECT_CONTENT.physics;
  const handleStartLearning = (text) => {
    navigate(`/workspace?q=${encodeURIComponent(text)}`);
  };
  return (
    <div className="subject-page">
      <section className="subject-hero">
        <div className="subject-hero-inner">
          <div
            className="subject-hero-icon"
            style={{
              backgroundColor: `${subject.color}15`,
              color: subject.color,
            }}
          >
            <SubjectIcon type={subject.icon} size={48} />
          </div>
          <h1 className="subject-hero-title">{subject.name}</h1>
          <p className="subject-hero-subtitle">{content.welcome}</p>
          <p className="subject-hero-desc">{content.description}</p>
          <button
            className="subject-hero-cta"
            onClick={() => navigate('/workspace')}
          >
            开始学习
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M5 8l6 6-1.5 1.5L2 8l5.5-5.5L11 2z" />
            </svg>
          </button>
        </div>
      </section>

      <section className="subject-features">
        <div className="subject-section-inner">
          <h2 className="subject-section-title">核心知识点</h2>
          <div className="subject-features-grid">
            {content.sections.map((section, i) => (
              <div key={i} className="subject-feature-card">
                <h3 className="subject-feature-title">{section.title}</h3>
                <ul className="subject-feature-items">
                  {section.items.map((item, j) => (
                    <li key={j} className="subject-feature-item">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="subject-examples">
        <div className="subject-section-inner">
          <h2 className="subject-section-title">典型例题</h2>
          <div className="subject-examples-grid">
            {content.examples.map((ex, i) => (
              <button
                key={i}
                className="subject-example-card"
                onClick={() => handleStartLearning(ex.text)}
              >
                <span className="subject-example-category">{ex.category}</span>
                <span className="subject-example-text">{ex.text}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="subject-action">
        <div className="subject-section-inner">
          <div className="subject-action-card">
            <h3>准备好开始{subject.name}学习之旅了吗？</h3>
            <p>AI智能解析，帮助你轻松掌握每一个知识点</p>
            <button
              className="subject-action-btn"
              onClick={() => navigate('/workspace')}
            >
              立即体验
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
