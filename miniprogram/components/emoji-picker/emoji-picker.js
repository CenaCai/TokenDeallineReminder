// components/emoji-picker/emoji-picker.js
const PRODUCT_EMOJIS = [
  '🤖', '🧠', '💬', '🎯', '🔥', '⚡', '🚀', '💡',
  '☁️', '🌐', '📱', '💻', '🖥️', '📊', '📈', '📉',
  '💳', '💰', '🏦', '💎', '🏷️', '🎁', '🔔', '⏰',
  '📞', '📡', '🔒', '🔑', '🛡️', '⚙️', '🛠️', '🔧',
  '🎬', '🎵', '📖', '✈️', '🏠', '🎮', '🍜', '☕',
  '🧪', '🔬', '🎨', '📝', '📦', '🧩', '🎪', '🌟'
]

Component({
  properties: {
    visible: { type: Boolean, value: false },
    current: { type: String, value: '📦' }
  },
  data: {
    emojis: PRODUCT_EMOJIS,
    selected: ''
  },
  observers: {
    'current': function(val) {
      this.setData({ selected: val })
    }
  },
  methods: {
    onSelect(e) {
      const emoji = e.currentTarget.dataset.emoji
      this.setData({ selected: emoji })
      this.triggerEvent('select', { emoji })
    },
    onClose() {
      this.triggerEvent('close')
    }
  }
})
