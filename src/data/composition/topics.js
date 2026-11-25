/**
 * 作文方向标签。
 *
 * 依据新高考常见命题维度归纳，用于素材归类与首页筛选。
 * 具体年份真题的权重待联网核实后调整 —— 这里只定义「有哪些方向」，
 * 不对任何一年的题目下断言。
 *
 * 每条素材允许挂 2–3 个标签：好素材往往多义，
 * 只挂一个等于浪费一半复用价值。
 */
export const TOPICS = [
  {
    id: 'tech-humanity',
    label: '科技与人文',
    desc: '工具与人的关系、AI 时代人的价值',
  },
  {
    id: 'critical-thinking',
    label: '独立思考',
    desc: '信息辨别、答案与问题、不盲从',
  },
  {
    id: 'youth-responsibility',
    label: '青年担当',
    desc: '个人选择与时代需要',
  },
  {
    id: 'persistence',
    label: '坚持与积累',
    desc: '长期主义、慢功夫、日复一日',
  },
  {
    id: 'setback-growth',
    label: '挫折与成长',
    desc: '逆境、试错、韧性',
  },
  {
    id: 'inheritance-innovation',
    label: '传承与创新',
    desc: '传统文化的现代表达',
  },
  {
    id: 'ordinary-greatness',
    label: '平凡与伟大',
    desc: '普通岗位上的长期坚守',
  },
  {
    id: 'rules-flexibility',
    label: '规则与变通',
    desc: '原则性与灵活性',
  },
  {
    id: 'cooperation-competition',
    label: '合作与竞争',
    desc: '个体与集体、共赢与博弈',
  },
  {
    id: 'aesthetics-life',
    label: '审美与生活',
    desc: '美育、诗意栖居、生活态度',
  },
]

export const TOPIC_MAP = Object.fromEntries(TOPICS.map((t) => [t.id, t]))

export function topicLabel(id) {
  return TOPIC_MAP[id]?.label || id
}
