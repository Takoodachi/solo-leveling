import { beforeEach, describe, expect, it, vi } from 'vitest'

// The APK and the open workout as the page finds them in the Android app; the site knows build 12
const fake = vi.hoisted(() => ({
  build: 0,
  draft: null as object | null,
  updateApk: vi.fn<(build: number, install: boolean) => Promise<boolean>>(async () => true),
}))
vi.mock('@/lib/native', () => ({ apkBuild: async () => fake.build, updateApk: fake.updateApk }))
vi.mock('@/features/workouts/store', () => ({ useWorkoutStore: { getState: () => ({ draft: fake.draft }) } }))
vi.mock('@/lib/apkBuild', () => ({ LATEST_APK: { build: 12 } }))

let page: EventTarget & { visibilityState: string }

/** A launch on this APK: the module starts afresh, as the page does. */
async function launch(build: number) {
  fake.build = build
  vi.resetModules()
  const { keepUpToDate } = await import('./appUpdate')
  keepUpToDate()
  await new Promise(resolve => setTimeout(resolve)) // the fetch at launch
}

function show(state: 'visible' | 'hidden') {
  page.visibilityState = state
  page.dispatchEvent(new Event('visibilitychange'))
}

const installs = () => fake.updateApk.mock.calls.filter(([, install]) => install).length

describe('the Android app installing its own newer build', () => {
  beforeEach(() => {
    fake.updateApk.mockClear()
    fake.draft = null
    page = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    vi.stubGlobal('document', page)
    vi.stubGlobal('navigator', {}) // no service worker: only the APK is looked at here
    vi.useFakeTimers({ toFake: ['setInterval'] })
  })

  it('fetches it at launch and installs it the first time the app is left, once', async () => {
    await launch(11)
    expect(fake.updateApk).toHaveBeenCalledWith(12, false)
    show('hidden')
    expect(fake.updateApk).toHaveBeenLastCalledWith(12, true)
    show('visible')
    show('hidden')
    expect(installs()).toBe(1)
  })

  it('waits while a workout is open', async () => {
    fake.draft = {}
    await launch(11)
    show('hidden')
    expect(installs()).toBe(0)
    fake.draft = null
    show('visible')
    show('hidden')
    expect(installs()).toBe(1)
  })

  it('leaves an up-to-date app alone', async () => {
    await launch(12)
    show('hidden')
    expect(fake.updateApk).not.toHaveBeenCalled()
  })
})
