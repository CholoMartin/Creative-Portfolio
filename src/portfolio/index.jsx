// Maps each island to its own category window component.
import EcommerceStore from './EcommerceStore'
import ArtCodex from './ArtCodex'
import MediaGallery from './MediaGallery'
import QuestBoard from './QuestBoard'
import CharacterSelect from './CharacterSelect'

const VIEWS = { ecommerce: EcommerceStore, illustration: ArtCodex, thumbnails: MediaGallery, layouts: QuestBoard, nft: CharacterSelect }

export function CategoryWindow({ cat, ...props }) {
  const View = VIEWS[cat.id]
  return View ? <View cat={cat} {...props} /> : null
}
