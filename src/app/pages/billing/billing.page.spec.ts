import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BillingPage } from "./invoices.page";

describe("InvoicesPage", () => {
  let component: BillingPage;
  let fixture: ComponentFixture<BillingPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BillingPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BillingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
