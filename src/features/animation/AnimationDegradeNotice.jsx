/**
 * 动画降级提示 —— 设计 §4.3。
 *
 * 统一原则：任何一支失败都退回「静态图 + 步骤」，绝不静默退回一个随便画的动画。
 * 所以这里不是错误弹窗，而是把「播放」这个动作本身降级掉：
 * 按钮变成「暂不支持动画」，旁边挂一个共用反馈入口（§4.3 一键反馈 / §4.4 作废）。
 */

const ROOT_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  width: '100%',
  height: '100%',
  minHeight: '160px',
  padding: '20px',
  boxSizing: 'border-box',
  textAlign: 'center',
  font: '13px/1.6 system-ui, sans-serif',
  color: 'rgba(31, 36, 48, 0.72)',
  background: '#f4f6f8',
};

const TITLE_STYLE = {
  font: '600 15px/1.4 system-ui, sans-serif',
  color: '#1f2430',
};

const REASON_STYLE = {
  maxWidth: '320px',
  color: 'rgba(31, 36, 48, 0.6)',
};

const ROW_STYLE = { display: 'flex', gap: '8px', marginTop: '4px' };

const BUTTON_STYLE = {
  minWidth: '96px',
  padding: '8px 14px',
  border: '1px solid rgba(31, 36, 48, 0.18)',
  borderRadius: '6px',
  background: '#fff',
  color: '#1f2430',
  font: '13px/1 system-ui, sans-serif',
  cursor: 'pointer',
};

const LINK_STYLE = {
  ...BUTTON_STYLE,
  minWidth: 'auto',
  color: 'rgba(31, 36, 48, 0.62)',
};

export default function AnimationDegradeNotice({
  reason = '',
  code = '',
  onFeedback,
  onRetry,
  busy = false,
  feedbackState = 'idle',
  height = '100%',
}) {
  const sent = feedbackState === 'sent';

  return (
    <div style={{ ...ROOT_STYLE, height }} role="status" aria-live="polite">
      <p style={TITLE_STYLE}>暂不支持动画</p>
      <p style={REASON_STYLE}>
        {reason || '这道题的动画暂时生成不出来。'}
        <br />
        静态图与解题步骤不受影响，可以继续看。
      </p>
      <div style={ROW_STYLE}>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={onRetry}
          disabled={busy}
          title={code ? `降级代码：${code}` : undefined}
        >
          {busy ? '生成中…' : '再试一次'}
        </button>
        <button
          type="button"
          style={LINK_STYLE}
          onClick={() => onFeedback?.(reason)}
          disabled={sent}
        >
          {sent ? '已反馈，谢谢' : '这画得不对'}
        </button>
      </div>
    </div>
  );
}
