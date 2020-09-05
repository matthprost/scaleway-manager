import { TestBed } from '@angular/core/testing';

import { BmaasService } from './bmaas.service';

describe('BmaasService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BmaasService = TestBed.get(BmaasService);
    expect(service).toBeTruthy();
  });
});
