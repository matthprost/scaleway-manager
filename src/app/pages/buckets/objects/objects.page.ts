import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  public currentPath: string = null;

  constructor(private route: ActivatedRoute, private router: Router) {
    const pathArray = this.router.url.split('/');
    this.currentPath = pathArray[pathArray.length - 1];
  }

  ngOnInit() {
  }

}
