import { TestBed } from '@angular/core/testing';

import { SshKeysService } from './ssh-keys.service';

describe('SshKeysService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SshKeysService = TestBed.get(SshKeysService);
    expect(service).toBeTruthy();
  });
});
