import behaviorsData from './behaviors.json'
import connectionsData from './connections.json'
import regionsData from './regions.json'
import sourcesData from './sources.json'
import storyData from './story.json'
import type {
  BehaviorData,
  ConnectionData,
  RegionData,
  SourceData,
  StoryChapter,
} from '../types/neuro'

export const regions = regionsData as RegionData[]
export const behaviors = behaviorsData as BehaviorData[]
export const connections = connectionsData as ConnectionData[]
export const sources = sourcesData as SourceData[]
export const story = storyData as StoryChapter[]

export const getBehaviorById = (behaviorId: string) =>
  behaviors.find((behavior) => behavior.id === behaviorId)

export const getRegionById = (regionId: string) =>
  regions.find((region) => region.id === regionId)
