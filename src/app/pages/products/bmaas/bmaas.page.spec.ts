import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, type ComponentFixture, TestBed } from "@angular/core/testing";

import { BmaasPage } from "./bmaas.page";

describe("BmaasPage", () => {
  let component: BmaasPage;
  let fixture: ComponentFixture<BmaasPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BmaasPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BmaasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
