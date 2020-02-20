import { TestBed } from '@angular/core/testing';

import { ObjectService } from './object.service';

describe('ObjectService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ObjectService = TestBed.get(ObjectService);
    expect(service).toBeTruthy();
  });
});
