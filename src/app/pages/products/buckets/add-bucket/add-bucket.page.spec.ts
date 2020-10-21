import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBucketPage } from './add-bucket.page';

describe('AddBucketPage', () => {
  let component: AddBucketPage;
  let fixture: ComponentFixture<AddBucketPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddBucketPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddBucketPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
