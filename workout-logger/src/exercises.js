/** 训练动作分类库 —— 按部位，方便健身房快速点选 */

export const CATEGORIES = [
  { id: 'chest', label: '胸' },
  { id: 'back', label: '背' },
  { id: 'shoulder', label: '肩' },
  { id: 'legs', label: '腿' },
  { id: 'glutes', label: '臀' },
  { id: 'arms', label: '手臂' },
  { id: 'core', label: '核心' },
  { id: 'other', label: '其他' },
]

export const EXERCISE_LIBRARY = [
  // 胸
  { name: '杠铃卧推', category: 'chest' },
  { name: '上斜卧推', category: 'chest' },
  { name: '下斜卧推', category: 'chest' },
  { name: '哑铃卧推', category: 'chest' },
  { name: '哑铃飞鸟', category: 'chest' },
  { name: '绳索夹胸', category: 'chest' },
  { name: '俯卧撑', category: 'chest' },
  // 背
  { name: '引体向上', category: 'back' },
  { name: '杠铃划船', category: 'back' },
  { name: '高位下拉', category: 'back' },
  { name: '坐姿划船', category: 'back' },
  { name: '单臂哑铃划船', category: 'back' },
  { name: '硬拉', category: 'back' },
  { name: '直臂下压', category: 'back' },
  // 肩
  { name: '杠铃肩推', category: 'shoulder' },
  { name: '哑铃肩推', category: 'shoulder' },
  { name: '侧平举', category: 'shoulder' },
  { name: '前平举', category: 'shoulder' },
  { name: '面拉', category: 'shoulder' },
  { name: '反向飞鸟', category: 'shoulder' },
  { name: '耸肩', category: 'shoulder' },
  // 腿
  { name: '深蹲', category: 'legs' },
  { name: '前蹲', category: 'legs' },
  { name: '腿举', category: 'legs' },
  { name: '罗马尼亚硬拉', category: 'legs' },
  { name: '腿弯举', category: 'legs' },
  { name: '腿伸展', category: 'legs' },
  { name: '弓步蹲', category: 'legs' },
  { name: '保加利亚分腿蹲', category: 'legs' },
  { name: '提踵', category: 'legs' },
  // 臀
  { name: '臀桥', category: 'glutes' },
  { name: '杠铃髋推', category: 'glutes' },
  { name: '绳索后踢', category: 'glutes' },
  { name: '侧卧蚌式开合', category: 'glutes' },
  // 手臂
  { name: '二头弯举', category: 'arms' },
  { name: '锤式弯举', category: 'arms' },
  { name: '集中弯举', category: 'arms' },
  { name: '三头下压', category: 'arms' },
  { name: '窄距卧推', category: 'arms' },
  { name: '过头臂屈伸', category: 'arms' },
  { name: '臂屈伸', category: 'arms' },
  // 核心
  { name: '卷腹', category: 'core' },
  { name: '平板支撑', category: 'core' },
  { name: '悬垂举腿', category: 'core' },
  { name: '俄罗斯转体', category: 'core' },
  { name: '死虫', category: 'core' },
  // 其他
  { name: '农夫行走', category: 'other' },
  { name: '开合跳', category: 'other' },
  { name: '战绳', category: 'other' },
]

const byName = new Map(EXERCISE_LIBRARY.map((e) => [e.name, e.category]))

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || '其他'
}

export function guessCategory(name) {
  const trimmed = name.trim()
  if (byName.has(trimmed)) return byName.get(trimmed)
  // 简单关键词兜底
  if (/卧推|飞鸟|夹胸|俯卧撑/.test(trimmed)) return 'chest'
  if (/划船|下拉|引体|硬拉|背部/.test(trimmed)) return 'back'
  if (/肩推|平举|面拉|耸肩|飞鸟/.test(trimmed)) return 'shoulder'
  if (/深蹲|腿|弓步|提踵|分腿/.test(trimmed)) return 'legs'
  if (/臀|髋推|蚌式/.test(trimmed)) return 'glutes'
  if (/弯举|三头|二头|臂屈伸|窄距/.test(trimmed)) return 'arms'
  if (/腹|平板|核心|转体|死虫/.test(trimmed)) return 'core'
  return 'other'
}

export function exercisesInCategory(categoryId) {
  return EXERCISE_LIBRARY.filter((e) => e.category === categoryId)
}
