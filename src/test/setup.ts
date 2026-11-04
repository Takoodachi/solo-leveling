// Dexie needs IndexedDB, which Node doesn't have: a faithful stand-in, so code that reads and
// writes the database runs in tests as it does on a phone
import 'fake-indexeddb/auto'
