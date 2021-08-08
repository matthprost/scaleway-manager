import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DoubleAuthPage } from "./double-auth.page";

describe("DoubleAuthPage", () => {
  let component: DoubleAuthPage;
  let fixture: ComponentFixture<DoubleAuthPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DoubleAuthPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DoubleAuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
