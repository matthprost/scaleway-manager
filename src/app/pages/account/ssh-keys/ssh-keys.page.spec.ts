import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SshKeysPage } from "./ssh-keys.page";

describe("SshKeysPage", () => {
  let component: SshKeysPage;
  let fixture: ComponentFixture<SshKeysPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SshKeysPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SshKeysPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
