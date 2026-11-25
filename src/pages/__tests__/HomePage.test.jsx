import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../HomePage'
import MaterialsPage from '../MaterialsPage'
import characters from '../../data/composition/characters.json'

const verifiedNames = characters.filter((c) => c.verified).map((c) => c.name)

function renderWithRouter(ui, entries = ['/']) {
  return render(<MemoryRouter initialEntries={entries}>{ui}</MemoryRouter>)
}

describe('HomePage', () => {
  it('展示一条已核实的人物素材', () => {
    renderWithRouter(<HomePage />)
    const shown = verifiedNames.some((name) => screen.queryAllByText(name).length > 0)
    expect(shown).toBe(true)
  })

  it('有「换一批」按钮且点击后仍能渲染', () => {
    renderWithRouter(<HomePage />)
    const btn = screen.getByRole('button', { name: '换一批' })
    fireEvent.click(btn)
    expect(btn).toBeTruthy()
    // 换一批后仍应停留在某条已核实素材上
    const shown = verifiedNames.some((name) => screen.queryAllByText(name).length > 0)
    expect(shown).toBe(true)
  })

  it('素材卡上显示适用方向标签', () => {
    renderWithRouter(<HomePage />)
    // 三条已核实素材都挂了「坚持与积累」
    expect(screen.getAllByText('坚持与积累').length).toBeGreaterThan(0)
  })
})

describe('MaterialsPage', () => {
  it('按方向筛选后只显示该方向的素材', () => {
    renderWithRouter(<MaterialsPage />, ['/materials?topic=persistence'])
    expect(screen.getAllByText('坚持与积累').length).toBeGreaterThan(0)
    // 张桂梅挂了 persistence，应出现在结果里
    expect(screen.getByText('张桂梅')).toBeTruthy()
  })

  it('无匹配素材时给出明确说明，而不是空白', () => {
    renderWithRouter(<MaterialsPage />, ['/materials?topic=rules-flexibility'])
    expect(screen.getByText(/还没有已核实的素材/)).toBeTruthy()
  })
})
