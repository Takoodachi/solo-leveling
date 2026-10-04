// Prints a new VAPID key pair for web push (reminder notifications). Run once: node scripts/generate-vapid.mjs
//
// - The PUBLIC key goes in the site's build variables as VITE_VAPID_PUBLIC_KEY (Cloudflare, and
//   .env.local for local builds) and in the send-reminders function's secrets as VAPID_PUBLIC_KEY.
// - The PRIVATE key goes only in the function's secrets as VAPID_PRIVATE_KEY. Don't commit it.
//
// Changing the keys later signs every device out of push: each has to switch reminders on again.
import { generateKeyPairSync } from 'crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const priv = privateKey.export({ format: 'jwk' })

// Web push wants the raw uncompressed point (0x04 | X | Y) and the raw private scalar, base64url
const point = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')])

console.log(`VAPID_PUBLIC_KEY=${point.toString('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${priv.d}`)
