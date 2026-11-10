import { humanizeMethod } from './activity';

describe('humanizeMethod', () => {
  it('splits camel case', () => {
    expect(humanizeMethod('StopServer')).toBe('Stop server');
    expect(humanizeMethod('CreateIPAddress')).toBe('Create IP address');
    expect(humanizeMethod('Login')).toBe('Login');
  });
});
