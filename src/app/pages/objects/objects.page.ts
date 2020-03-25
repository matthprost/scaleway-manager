import {Component, OnInit} from '@angular/core';
import {ObjectService} from '../../services/object/object.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  constructor(private objectService: ObjectService, private statusBar: StatusBar) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    this.statusBar.styleDefault();
    
    const result = await this.objectService.request('fr-par');
    console.log('RESULT:', result);
  }
}
