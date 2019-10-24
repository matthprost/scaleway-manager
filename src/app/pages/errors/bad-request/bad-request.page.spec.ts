import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BadRequestPage } from './bad-request.page';

describe('BadRequestPage', () => {
  let component: BadRequestPage;
  let fixture: ComponentFixture<BadRequestPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BadRequestPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BadRequestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
