import { validatePublicKey } from './sshKeys';

describe('validatePublicKey', () => {
  it('accepts ed25519 and rsa keys with comments', () => {
    expect(
      validatePublicKey('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl me@laptop'),
    ).toBe('ok');
    expect(validatePublicKey('  ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7 \n')).toBe('ok');
  });

  it('rejects a private key header', () => {
    expect(validatePublicKey('-----BEGIN OPENSSH PRIVATE KEY-----')).toBe('invalid');
  });

  it('rejects unknown types, missing data and bad base64', () => {
    expect(validatePublicKey('ssh-foo AAAA')).toBe('invalid');
    expect(validatePublicKey('ssh-rsa')).toBe('invalid');
    expect(validatePublicKey('ssh-rsa not*base64!')).toBe('invalid');
    expect(validatePublicKey('ssh-rsa AAAAB')).toBe('invalid');
  });

  it('reports empty', () => {
    expect(validatePublicKey('')).toBe('empty');
    expect(validatePublicKey('   \n ')).toBe('empty');
  });
});
