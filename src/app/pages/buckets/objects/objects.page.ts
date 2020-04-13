import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  public currentPath: string = null;

  constructor(private route: ActivatedRoute) {
    this.currentPath = this.route.snapshot.paramMap.get('id');
  }

  ngOnInit() {
  }

}
