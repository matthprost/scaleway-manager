import { TestBed, inject, waitForAsync } from "@angular/core/testing";

import { HomeGuard } from "./home.guard";

describe("AuthGuard", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HomeGuard],
    });
  });

  it("should ...", inject([HomeGuard], (guard: HomeGuard) => {
    expect(guard).toBeTruthy();
  }));
});
