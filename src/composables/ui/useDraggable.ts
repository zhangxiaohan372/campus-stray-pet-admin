import { ref, onMounted, onUnmounted } from 'vue'

export function useDraggable(width = 360, height = 540, initialMargin = 24) {
  const isDragging = ref(false)
  const pos = ref<{ x: number; y: number } | null>(null)

  let startPointerX = 0
  let startPointerY = 0
  let startPosX = 0
  let startPosY = 0

  // 初始化默认停靠在视口右下角
  const initDefaultPosition = () => {
    if (typeof window === 'undefined') return
    const maxX = Math.max(0, window.innerWidth - width - initialMargin)
    const maxY = Math.max(0, window.innerHeight - height - initialMargin)
    pos.value = { x: maxX, y: maxY }
  }

  // 约束坐标在视口可见范围之内（防止拖出屏幕）
  const clamp = (x: number, y: number) => {
    const maxX = Math.max(0, window.innerWidth - width)
    const maxY = Math.max(0, window.innerHeight - height)
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    // 仅响应鼠标主键（左键）或单指触碰
    if (e.button !== 0) return
    if (!pos.value) initDefaultPosition()

    isDragging.value = true
    startPointerX = e.clientX
    startPointerY = e.clientY
    startPosX = pos.value!.x
    startPosY = pos.value!.y

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging.value) return
    const dx = e.clientX - startPointerX
    const dy = e.clientY - startPointerY
    pos.value = clamp(startPosX + dx, startPosY + dy)
  }

  const onPointerUp = () => {
    isDragging.value = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  const onResize = () => {
    if (pos.value) {
      pos.value = clamp(pos.value.x, pos.value.y)
    }
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  })

  return {
    pos,
    isDragging,
    initDefaultPosition,
    onPointerDown,
  }
}

