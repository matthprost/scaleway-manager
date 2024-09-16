import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, type ComponentFixture, TestBed } from "@angular/core/testing";

import { BucketsPage } from "./buckets.page";

describe("ObjectsPage", () => {
  let component: BucketsPage;
  let fixture: ComponentFixture<BucketsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BucketsPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BucketsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
