import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicesPage } from './invoices.page';

describe('InvoicesPage', () => {
  let component: InvoicesPage;
  let fixture: ComponentFixture<InvoicesPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvoicesPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoicesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
