import { TestBed, inject, waitForAsync } from "@angular/core/testing";

import { DoubleAuthGuard } from "./double-auth.guard";

describe("DoubleAuthGuard", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DoubleAuthGuard],
    });
  });

  it("should ...", inject([DoubleAuthGuard], (guard: DoubleAuthGuard) => {
    expect(guard).toBeTruthy();
  }));
});
