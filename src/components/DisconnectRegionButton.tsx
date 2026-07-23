import { useNeuroTripStore } from '../stores/neuroTripStore'
import { useUiLanguageStore } from '../stores/uiLanguageStore'
import type { RegionId } from '../types/neuro'

type DisconnectRegionButtonProps = {
  regionId: RegionId
}

export const DisconnectRegionButton = ({ regionId }: DisconnectRegionButtonProps) => {
  const disconnectedRegions = useNeuroTripStore((state) => state.disconnectedRegions)
  const toggleDisconnectedRegion = useNeuroTripStore((state) => state.toggleDisconnectedRegion)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const isDisconnected = disconnectedRegions.includes(regionId)

  return (
    <button
      type="button"
      className={`disconnect-button ${isDisconnected ? 'disconnected' : ''}`}
      aria-pressed={isDisconnected}
      aria-label={
        isZh ? `切换 ${regionId} 区域断连模式` : `Disconnect ${regionId} simulation mode`
      }
      onClick={() => {
        toggleDisconnectedRegion(regionId)
        recordInteraction({
          type: 'toggle-disconnect',
          scene: regionId,
          target: regionId,
          timestamp: Date.now(),
          metadata: { disconnected: !isDisconnected },
        })
      }}
    >
      {isDisconnected ? (isZh ? '重新连接区域' : 'RECONNECT REGION') : isZh ? '断开区域' : 'DISCONNECT REGION'}
    </button>
  )
}
