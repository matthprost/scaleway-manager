import {Component, OnInit} from '@angular/core';
import {ObjectService} from '../../services/object/object.service';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  constructor(private objectService: ObjectService) {
  }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    const result = await this.objectService.request('fr-par');
    console.log('RESULT:', result);
  }
}
