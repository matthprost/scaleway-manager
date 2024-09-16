import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, type ComponentFixture, TestBed } from "@angular/core/testing";

import { InstancesPage } from "./instances.page";

describe("InstancesPage", () => {
  let component: InstancesPage;
  let fixture: ComponentFixture<InstancesPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [InstancesPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InstancesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
