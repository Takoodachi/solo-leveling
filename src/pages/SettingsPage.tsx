import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import TargetForm from '@/features/settings/components/TargetForm'
import ExportButton from '@/features/settings/components/ExportButton'
import ImportButton from '@/features/settings/components/ImportButton'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useAuth } from '@/features/auth/useAuth'

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { session, signOut } = useAuth()

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Targets */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Daily Targets</h2>
        <Card>
          <CardContent className="p-4">
            <TargetForm />
          </CardContent>
        </Card>
      </section>

      {/* Workout preferences */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Workout</h2>
        <Card>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Rest timer (seconds)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="10"
                max="600"
                value={settings?.defaultRestSeconds ?? 90}
                onChange={e => void updateSettings({ defaultRestSeconds: Number(e.target.value) })}
                className="w-32"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Barbell weight (kg)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={settings?.barWeightKg ?? 20}
                onChange={e => void updateSettings({ barWeightKg: Number(e.target.value) })}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Data</h2>
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              All data is stored on your device. Export regularly to back up.
            </p>
            <div className="flex gap-2">
              <ExportButton />
              <ImportButton />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Account */}
      {session && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account</h2>
          <Card>
            <CardContent className="p-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
              <Button
                variant="outline"
                className="gap-2 w-fit"
                onClick={() => void signOut()}
              >
                <LogOut size={16} />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <p className="text-xs text-muted-foreground text-center">Solo Leveling v0.1.0</p>
    </div>
  )
}
