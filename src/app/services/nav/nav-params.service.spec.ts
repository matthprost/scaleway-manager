import { TestBed } from '@angular/core/testing';

import { NavParamsService } from './nav-params.service';

describe('NavParamsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NavParamsService = TestBed.get(NavParamsService);
    expect(service).toBeTruthy();
  });
});
