import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjInfosPage } from './obj-infos.page';

describe('ObjInfosPage', () => {
  let component: ObjInfosPage;
  let fixture: ComponentFixture<ObjInfosPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObjInfosPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObjInfosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
