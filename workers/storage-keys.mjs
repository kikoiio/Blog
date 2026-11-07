export const retentionStateKey = 'maintenance/retention.json'
export const retentionLeaseKey = 'maintenance/lease.json'

export function managedObject(kind, key) {
  if (kind === 'source') return /^sources\/[a-f0-9]{64}$/.test(key) || /^releases\/[a-f0-9]{64}\.json$/.test(key)
  return kind === 'media' && (/^images\/(?:v1\/[a-f0-9]{64}\/(?:640|2400)|v2\/[a-f0-9]{64}\/(?:640|1600|2400))\.webp$/.test(key)
    || /^metadata\/v[12]\/[a-f0-9]{64}\.json$/.test(key))
}
