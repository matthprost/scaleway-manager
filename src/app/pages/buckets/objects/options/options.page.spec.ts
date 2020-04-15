import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionsPage } from './options.page';

describe('OptionsPage', () => {
  let component: OptionsPage;
  let fixture: ComponentFixture<OptionsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OptionsPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OptionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
