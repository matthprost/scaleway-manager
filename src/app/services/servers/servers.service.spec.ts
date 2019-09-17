import { TestBed } from '@angular/core/testing';

import { ServersService } from './servers.service';

describe('ServersService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ServersService = TestBed.get(ServersService);
    expect(service).toBeTruthy();
  });
});
