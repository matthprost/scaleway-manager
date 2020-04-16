import {Component, OnInit} from '@angular/core';
import {NavParams} from '@ionic/angular';

@Component({
  selector: 'app-options',
  templateUrl: './options.page.html',
  styleUrls: ['./options.page.scss'],
})
export class OptionsPage implements OnInit {

  public type: 'folder' | 'standard' | 'glacier' = null;

  constructor(private navParams: NavParams) {
    this.type = this.navParams.get('type');
  }

  ngOnInit() {
  }

}
