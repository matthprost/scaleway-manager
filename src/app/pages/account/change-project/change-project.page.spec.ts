import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, type ComponentFixture, TestBed } from "@angular/core/testing";

import { ChangeProjectPage } from "./change-project.page";

describe("ChangeProjectPage", () => {
  let component: ChangeProjectPage;
  let fixture: ComponentFixture<ChangeProjectPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ChangeProjectPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeProjectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
