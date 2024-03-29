import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TokensPage } from "./tokens.page";

describe("TokensPage", () => {
  let component: TokensPage;
  let fixture: ComponentFixture<TokensPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TokensPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TokensPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
