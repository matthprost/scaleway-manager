import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSshKeyPage } from './add-ssh-key.page';

describe('AddSshKeyPage', () => {
  let component: AddSshKeyPage;
  let fixture: ComponentFixture<AddSshKeyPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddSshKeyPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSshKeyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
