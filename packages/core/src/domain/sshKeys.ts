export type SshKey = {
  id: string;
  name: string;
  fingerprint: string;
  createdAt: string;
  projectId: string;
  // Scaleway lists disabled keys too.
  disabled: boolean;
};

const KEY_TYPES = [
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'sk-ssh-ed25519@openssh.com',
  'sk-ecdsa-sha2-nistp256@openssh.com',
];

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function validatePublicKey(text: string): 'ok' | 'empty' | 'invalid' {
  const trimmed = text.trim();
  if (trimmed === '') {
    return 'empty';
  }

  const [type, data] = trimmed.split(/\s+/);

  return type !== undefined && KEY_TYPES.includes(type) && data !== undefined && data.length % 4 === 0 && BASE64.test(data)
    ? 'ok'
    : 'invalid';
}
