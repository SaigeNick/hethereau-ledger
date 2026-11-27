import { demoFiles } from './demo'
import { parseExport } from './importer'
import type { useStore } from './store'

/** Loads sample data into its own profile. Reachable only at #/demo. */
export function loadDemo(store: ReturnType<typeof useStore>) {
  const old = store.state.profiles.find((p) => p.gameUid === 'demo')
  if (old) store.deleteProfile(old.id)
  let id = ''
  for (const f of demoFiles()) id = store.importParsed(parseExport(f)).profileId
  if (id) store.updateProfile(id, { name: 'Demo' })
}
